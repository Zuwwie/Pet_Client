// src/services/packaging.options.ts
import type { IPackaging } from "@/models/IPackaging";
import { PACKAGING_IMG } from "./packaging.images";

// Якщо вносиш ціну в гривнях — використовуй toKop(грн)
const toKop = (uah: number) => Math.round(uah * 100);

const base: Omit<IPackaging, "imageUrl">[] = [
    { id: "box-1",  name: "Коробка Червона з ручками",                        priceKop: toKop(20), capacityG: 800  },
    { id: "box-2",  name: "Коробка  Сумка Бірюза Ведмедик на санках",          priceKop: toKop(16), capacityG: 1000 },
    { id: "box-3",  name: "Коробка ЧЕРВОНА Сумка з Миколаєм та Оленем",        priceKop: toKop(16), capacityG: 650  },
    { id: "box-4",  name: "Коробка БУДИНОК ВЕЛИКИЙ БЛАКИТНИЙ",                 priceKop: toKop(25), capacityG: 1500 },
    { id: "box-5",  name: "Коробка Казковий будиночок з комином",              priceKop: toKop(10), capacityG: 350  },
    { id: "box-6",  name: "Коробка Сумка Сніговик",                            priceKop: toKop(20), capacityG: 1000 },
    { id: "box-7",  name: "Коробка СНІГОВИЧОК Коробка з ручкою",               priceKop: toKop(25), capacityG: 800  },
    { id: "box-8",  name: "Коробка NEW Олені САКВОЯЖ",                         priceKop: toKop(25), capacityG: 2000 },
    { id: "box-9",  name: "Коробка Куб з Бантом",                              priceKop: toKop(16), capacityG: 900  },
    { id: "box-10", name: "Коробка БЕМБІ Коробка з ручкою",                    priceKop: toKop(25), capacityG: 800  },
    { id: "box-11", name: "Коробка Зелена Сумка з Миколаєм та Оленем",         priceKop: toKop(16), capacityG: 650  },
    { id: "box-12", name: "Коробка Синя з ручками",                            priceKop: toKop(20), capacityG: 800  },
    { id: "box-13", name: "Коробка Новорічний Будинок Сніговики",              priceKop: toKop(16), capacityG: 650  },
    { id: "box-14", name: "Коробка БУДИНОК ВЕЛИКИЙ Червоний",                  priceKop: toKop(25), capacityG: 1500 },
    { id: "box-15", name: "Пакет Малий",                                       priceKop: toKop(3),  capacityG: 700  },
    { id: "box-16", name: "Пакет Великий",                                     priceKop: toKop(4),  capacityG: 1500 },
];

export const PACKAGING_OPTIONS: IPackaging[] =
    base.map(p => ({ ...p, imageUrl: PACKAGING_IMG[p.id] }));

// У дев-режимі підсвітити, якщо якесь фото не знайдено
if (import.meta.env.DEV) {
    PACKAGING_OPTIONS.forEach(p => {
        if (!p.imageUrl) console.warn(`[packaging] немає зображення для id="${p.id}"`);
    });
}
