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
