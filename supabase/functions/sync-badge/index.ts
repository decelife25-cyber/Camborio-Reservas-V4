import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate pending count
    const { count, error: countError } = await supabase
      .from('Reservas')
      .select('*', { count: 'exact', head: true })
      .eq('Estado', 'PENDIENTE');

    if (countError) throw countError;
    const pendingCount = (count || 0).toString();

    // 2. Fetch FCM tokens
    const { data: tokensData, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (tokensError) throw tokensError;
    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No tokens to notify', count: pendingCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens = tokensData.map(t => t.token);

    // 3. Send to FCM (requires FIREBASE_SERVICE_ACCOUNT_KEY secret configured in Supabase)
    const firebaseKeyBase64 = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY');

    if (!firebaseKeyBase64) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set. Cannot send FCM.');
      return new Response(JSON.stringify({ success: true, message: 'FCM key not configured, but count is ' + pendingCount, count: pendingCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 service account JSON
    const serviceAccountStr = atob(firebaseKeyBase64);
    const serviceAccount = JSON.parse(serviceAccountStr);

    // Generate OAuth2 token (simplified for Deno, typically uses a JWT library)
    // For simplicity in this Edge Function context without external JWT heavy libraries,
    // we use a lightweight approach to sign a JWT for Google OAuth.
    // However, Google FCM HTTP v1 requires a valid OAuth2 token.
    // We will use the Google REST API for FCM v1.

    // Create JWT header and payload
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // To sign the JWT, we use WebCrypto API (available in Deno)
    const encoder = new TextEncoder();
    const base64UrlEncode = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${headerEncoded}.${payloadEncoded}`;

    // Import private key
    // Convert PEM to ArrayBuffer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = serviceAccount.private_key.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
    const binaryDerString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryDerString.length);
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      encoder.encode(dataToSign)
    );

    const signatureEncoded = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${dataToSign}.${signatureEncoded}`;

    // Exchange JWT for Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Error generating Google OAuth token:', errText);
      throw new Error('Failed to generate OAuth token');
    }

    const { access_token } = await tokenResponse.json();

    // Send the FCM messages
    const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    let sentCount = 0;
    let errorCount = 0;

    // Send to each token
    for (const token of tokens) {
      const fcmPayload = {
        message: {
          token: token,
          data: {
            pending_count: pendingCount
          }
        }
      };

      const sendResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fcmPayload)
      });

      if (sendResponse.ok) {
        sentCount++;
      } else {
        errorCount++;
        console.error(`Failed to send to token ${token.substring(0, 10)}...:`, await sendResponse.text());
        // Clean up invalid tokens could be implemented here
      }
    }

    return new Response(JSON.stringify({
      success: true,
      count: pendingCount,
      sent: sentCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync Badge Error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
