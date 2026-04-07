export function addDarkWatermark(email: string) {
  if (typeof document === "undefined") return () => {};

  const root = document.createElement("div");
  root.className = "dark-watermark";
  root.setAttribute("aria-hidden", "true");

  const lines = [
    `SECRET_ID: ${email}`,
    `SECRET_ID: ${email}`,
    `SECRET_ID: ${email}`,
    `SECRET_ID: ${email}`,
  ];

  for (const line of lines) {
    const el = document.createElement("div");
    el.className = "dark-watermark__line";
    el.textContent = line;
    root.appendChild(el);
  }

  document.body.appendChild(root);
  return () => {
    root.remove();
  };
}
