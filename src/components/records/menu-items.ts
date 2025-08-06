export const MENU_ITEMS = {
  Beverages: [
    { name: "Milk Tea", price: 30 },
    { name: "Black Tea", price: 25 },
    { name: "Lemon Tea", price: 25 },
    { name: "Milk Coffee", price: 100 },
    { name: "Black Coffee", price: 60 },
    { name: "Ice Coffee", price: 60 },
    { name: "Hot Lemon", price: 40 },
    { name: "Hot lemon (Honey & Ginger)", price: 80 },
    { name: "Sprite Lemonade", price: 120 },
    { name: "Peach Iced Tea", price: 120 },
    { name: "Coke/Fanta/Sprite", price: 80 },
    { name: "Lassi Half", price: 50 },
    { name: "Lassi Full", price: 100 },
  ],
  Food: [
    { name: "Sandwich", price: 60 },
    { name: "Sandwich with Fries", price: 100 },
    { name: "French Fries", price: 110 },
    { name: "Current", price: 90 },
    { name: "Current with omlet", price: 120 },
    { name: "Alu Chop", price: 80 },
    { name: "Wai Wai Sadheako", price: 60 },
    { name: "Wai Wai Soup/Fry", price: 70 },
    { name: "Aloo Cheese ball", price: 160 },
    { name: "Chicken Cheese ball", price: 280 },
    { name: "Chicken Kurkure", price: 240 },
    { name: "Bread Chop", price: 60 },
    { name: "Cookie", price: 20 },
    { name: "Biscuit", price: 15 },
  ],
  Other: [
    { name: "Sikher Ice", price: 25 },
    { name: "Churot", price: 30 },
    { name: "Happydent", price: 5 },
  ],
  Hookah: [
    { name: "Normal Hukka", price: 250 },
    { name: "Cloud Hukka", price: 480 },
  ],
}

const ALL_MENU_ITEMS = [
  ...MENU_ITEMS.Beverages,
  ...MENU_ITEMS.Food,
  ...MENU_ITEMS.Other,
  ...MENU_ITEMS.Hookah,
];

export const POPULAR_ITEMS = ALL_MENU_ITEMS.filter((item) =>
  ["Milk Tea", "Black Tea", "Lemon Tea", "Sikher Ice", "Churot", "Lassi Half"].some((popular) =>
    item.name.includes(popular),
  ),
).slice(0, 6);