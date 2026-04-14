import { GraduationCap, ShieldCheck, UserCircle, X } from "lucide-react";
import { useEffect } from "react";

type StudentLoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onChooseRole: (role: "student" | "faculty") => void;
};

function StudentLoginModal({ isOpen, onClose, onChooseRole }: StudentLoginModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRolePick = (role: "student" | "faculty") => {
    onChooseRole(role);
    onClose();
  };

  return (
    <div className="student-login-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="student-login-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="student-login-close" onClick={onClose} aria-label="Close login modal">
          <X size={20} />
        </button>

        <div className="student-login-header">
          <h2>Login as Student / Faculty</h2>
          <p>Choose how you want to continue into ByteHive.</p>
        </div>

        <div className="student-login-actions">
          <button type="button" className="student-login-option student-login-option-primary" onClick={() => handleRolePick("student")}>
            <span className="student-login-icon">
              <GraduationCap size={24} />
            </span>
            <span className="student-login-copy">
              <strong>Continue as Student</strong>
              <small>Open the login or signup flow for student access.</small>
            </span>
          </button>

          <button type="button" className="student-login-option" onClick={() => handleRolePick("faculty")}>
            <span className="student-login-icon">
              <ShieldCheck size={24} />
            </span>
            <span className="student-login-copy">
              <strong>Continue as Faculty</strong>
              <small>Open the login or signup flow for faculty access.</small>
            </span>
          </button>

          <button type="button" className="student-login-option student-login-option-disabled" disabled aria-disabled="true">
            <span className="student-login-icon student-login-icon-muted">
              <UserCircle size={24} />
            </span>
            <span className="student-login-copy">
              <strong>Guest Mode Coming Soon</strong>
              <small>This option is not available right now.</small>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentLoginModal;
