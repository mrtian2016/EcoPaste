import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "./styles/global.scss";
import "mac-scrollbar/dist/mac-scrollbar.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
