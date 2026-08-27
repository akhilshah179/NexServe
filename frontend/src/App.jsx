/**
 * App.jsx — Root component of the NexServe frontend.
 *
 * This is intentionally minimal. Its only job is to render
 * the router (AppRoutes), which handles everything else.
 *
 * In future phases, we'll wrap this with:
 * - AuthProvider (user authentication context)
 * - ToastProvider (notification system)
 * - ThemeProvider (if needed)
 */

import AppRoutes from "./routes/AppRoutes";

function App() {
  return <AppRoutes />;
}

export default App;
