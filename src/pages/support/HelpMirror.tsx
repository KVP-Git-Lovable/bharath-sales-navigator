import HelpCenter from "@/pages/HelpCenter";

// Mirror of the main Help Center — same component, single source of truth.
// Hide the app-style QuickApp header so only the Support tab bar shows.
export default function HelpMirror() {
  return <HelpCenter hideHeader />;
}