import "./SiriBorder.css";

interface SiriBorderProps {
  active: boolean;
}

export default function SiriBorder({ active }: SiriBorderProps) {
  return <div className={`siri-border ${active ? "active" : ""}`} />;
}