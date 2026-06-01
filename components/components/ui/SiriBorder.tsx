
import styles from "./SiriBorder.module.css";

interface SiriBorderProps {
  active: boolean;
}

export default function SiriBorder({ active }: SiriBorderProps) {
  return <div className={`${styles.siriBorder} ${active ? styles.active : ""}`} />;
}
