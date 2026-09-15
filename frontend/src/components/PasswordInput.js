import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-input">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
