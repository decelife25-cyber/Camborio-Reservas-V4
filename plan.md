1. **Set up the Android App Project**: Initialize a Capacitor + React + TypeScript project in the `android_app` directory to act as the private application. (Already done).
2. **Configure GitHub Actions for APK**: Create a GitHub Actions workflow in `.github/workflows/android.yml` to automatically build the APK from the `android_app` directory whenever changes are pushed.
3. **Set up Supabase Client**: Implement the connection to Supabase V4 in `android_app/src/lib/supabase.ts` using the provided credentials (Project ID: `caeszgtogifserrxdrcw`, anon key from `config.js`). Set up context for authentication.
4. **Develop Core Layout & Navigation**: Create a layout with a bottom or side navigation bar tailored for tablets/phones and a Dark/Light mode toggle.
5. **Implement Authentication**: Create a login screen (e.g., using a PIN or email/password mapped to Supabase Auth roles `authenticated`).
6. **Implement Screens**:
    - **Inicio (Dashboard)**: Quick overview of today's stats.
    - **Reservas de Hoy / Por Confirmar**: List of reservations for the current day or pending confirmation, with quick actions (Confirm, Sit).
    - **Calendario**: A robust calendar view for `COMIDA` and `CENA`, showing capacity and reservations per day.
    - **Mesas**: Table management view to assign/unassign tables to reservations and handle table groups (Mesas Adicionales).
    - **Clientes**: A directory of clients, with search functionality and history.
    - **Historial**: Log of actions and past reservations.
    - **Configuración**: App settings, including displaying the APK version (`versionName` and `versionCode`).
7. **Implement Business Logic (The Core)**:
    - Implement fetching and real-time updates for reservations.
    - Port the logic to handle shifts (COMIDA/CENA) based on a cut-off time.
    - Ensure table unassignment logic works (if a shift changes, tables are cleared).
    - Maintain visual fidelity to the described V2 private app, focusing on large touch targets and fast operation.
8. **Pre-commit Checks**: Run `pre_commit_instructions` and ensure all tests/builds pass.
9. **Finalize & Submit**: Ensure the Capacitor app builds correctly, the APK artifact is generated via Actions, and submit the changes.
