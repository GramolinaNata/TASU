import React, { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({ title, children, onClose, closable = true }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    // Блокировка скролла
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onOverlayClick = (e) => {
    if (closable && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div className="modal_overlay" ref={overlayRef} onClick={onOverlayClick}>
      <div className="modal_content">
        <div className="modal_header">
          <div className="modal_title">{title}</div>
          {closable && (
            <button className="modal_close" onClick={onClose}>
              &times;
            </button>
          )}
        </div>
        <div className="modal_body">{children}</div>
      </div>
    </div>
  );
}
