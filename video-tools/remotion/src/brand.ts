// Identidade visual padrão. Troque pelos valores da marca do cliente
// ou passe "brand" nas props de cada composição.
export type Brand = {
  primary: string;
  secondary: string;
  text: string;
  highlight: string;
  font: string;
};

export const defaultBrand: Brand = {
  primary: "#111111",
  secondary: "#FFD400",
  text: "#FFFFFF",
  highlight: "#FFD400",
  font: "Inter, Helvetica, Arial, sans-serif",
};

// Disalp — "Sistema de Comunicação e Design" (27/10/2026): grafite 80 / osso 15 / laranja 5.
export const disalpBrand: Brand = {
  primary: "#16191A",
  secondary: "#22272A",
  text: "#F4F2ED",
  highlight: "#E2630F",
  font: "Archivo, Karla, Arial, sans-serif",
};
