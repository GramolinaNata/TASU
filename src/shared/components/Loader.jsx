import React from 'react';

export default function Loader({ text = "Загрузка данных..." }) {
  return (
    <div className="loader_container">
      <div className="loader_spinner"></div>
      <div className="loader_text">{text}</div>
    </div>
  );
}
