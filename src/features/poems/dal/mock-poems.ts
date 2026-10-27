import "server-only";

import type { Poem } from "../model/poem.types";

/**
 * Placeholder poems written for this project (no third-party text), standing in for a database
 * table. Definition order is the order authors receive them: an author with N poems gets the first
 * N (design D2). Only `author-poems.ts` reads this set (NFR-3).
 */
export const MOCK_POEMS: readonly Poem[] = [
  {
    id: "osenniy-sad",
    title: "Осенний сад",
    text: [
      "Листва ложится на дорожки,",
      "Шуршит под шагом тишина,",
      "И капли светятся, как брошки,",
      "На тёмной ветке у окна.",
      "",
      "Ещё тепло, но день короче,",
      "И пахнет яблоком в траве,",
      "И сад молчит, и между прочим",
      "Хранит всё лето в голове.",
    ].join("\n"),
    illustrationSrc: "/mock-poems/osenniy-sad.svg",
    publishedAt: "2026-03-12",
    genre: "Лирика",
  },
  {
    id: "nochnoy-vokzal",
    title: "Ночной вокзал",
    text: [
      "Табло мигает жёлтыми словами,",
      "Последний поезд медлит у перрона,",
      "И проводник с потёртыми флажками",
      "Глядит на нас устало и бессонно.",
      "",
      "Здесь каждый ждёт кого-то или что-то,",
      "Сжимая в пальцах тёплые билеты,",
      "И пахнет кофе, рельсами, работой,",
      "И город спит, не зная про всё это.",
      "",
      "Гудок. Вагон качнулся, свет поплыл,",
      "Состав ушёл в густую темноту,",
      "А я стою, как будто что-то забыл.",
    ].join("\n"),
    illustrationSrc: "/mock-poems/nochnoy-vokzal.svg",
    publishedAt: "2026-07-01",
    genre: "Сонет",
  },
  {
    id: "zimniy-most",
    title: "Зимний мост",
    text: [
      "Над речкой мост, и снег лежит на перилах,",
      "Следы прохожих тают до утра.",
      "Я помню, как мы здесь когда-то были",
      "И как смеялись, глядя в холода.",
      "",
      "Теперь вода под коркой ледяною",
      "Течёт без нас, неслышно и светло,",
      "И только ветер говорит со мною",
      "О том, что было и уже прошло.",
    ].join("\n"),
    illustrationSrc: "/mock-poems/zimniy-most.svg",
    publishedAt: "2026-01-20",
    genre: "Элегия",
  },
  {
    id: "utrenniy-dvor",
    title: "Утренний двор",
    text: [
      "Дворник метёт асфальт",
      "широкими спокойными движениями,",
      "как будто пишет письмо",
      "всему переулку.",
      "",
      "Голуби читают его первыми.",
      "Потом соседка с собакой,",
      "потом мальчик с рюкзаком,",
      "опаздывающий в школу.",
      "",
      "К полудню письмо исчезнет,",
      "но двор весь день",
      "будет помнить,",
      "что с ним говорили.",
    ].join("\n"),
    illustrationSrc: "/mock-poems/utrenniy-dvor.svg",
    publishedAt: "2026-09-05",
    genre: "Верлибр",
  },
];
