import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Create root element and render app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
