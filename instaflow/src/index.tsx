import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./App";
import store from "./store/store";
import { QueryProvider } from "./lib/queryClient";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <BrowserRouter>
    <Provider store={store}>
      <QueryProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryProvider>
    </Provider>
  </BrowserRouter>
);
