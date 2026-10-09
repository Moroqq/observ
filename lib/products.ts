// Витрина продуктов студии.
//
// Добавить продукт: положить логотип в public/products/<id>.webp (256×256,
// прозрачный фон) и дописать строку сюда. Название и описание берутся из
// messages/{ru,en}.json по ключам products.items.<id>.{name,tagline}.
//
// Порядок в массиве — порядок на сайте.

export interface Product {
  id: string
  /** Путь к логотипу в public/. */
  logo: string
  /** Куда ведёт карточка. Пусто — логотип не кликабелен. */
  href?: string
}

export const PRODUCTS: Product[] = [
  { id: "kairo", logo: "/products/kairo.webp", href: "https://github.com/Moroqq/kairo" },
]
