import type { Poem } from "../model/poem.types";

export const FIXTURE_AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

export const NIGHT_STATION: Poem = {
  id: "30000000-0000-4000-8000-000000000052",
  title: "Ночной вокзал",
  text: "Табло мигает жёлтыми словами,\nПоследний поезд медлит у перрона.",
  illustrationUrl: null,
  publishedAt: "2026-07-01",
  genreId: null,
};

export const AUTUMN_GARDEN: Poem = {
  id: "30000000-0000-4000-8000-000000000051",
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
  illustrationUrl: `http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/${FIXTURE_AUTHOR_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.jpg`,
  publishedAt: "2026-03-12",
  genreId: "lyric",
};
