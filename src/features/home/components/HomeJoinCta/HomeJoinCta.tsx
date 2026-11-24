import { SIGN_UP_PATH } from "@/shared/config/account-paths";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";
import { ButtonLink } from "@/shared/ui";

import { getGreetingByKey } from "../../dal/home-greeting";
import { JOIN_GREETING_KEY } from "../../model/home.constants";
import { JOIN_COPY } from "../../model/home-messages";
import { resolveSectionCopy } from "../../model/resolve-home-content";
import { HomeSection } from "../HomeSection/HomeSection";
import { SectionHeading } from "../SectionHeading/SectionHeading";

/**
 * The closing invitation: a framed block with the heading, the text as plain-text paragraphs and the button to
 * `/signup`, which stays in code; always shown to a visitor who is not signed in. It reads its own copy here, not
 * in `HomeSections`, because it renders only inside `SignedOutOnly`: nothing session-dependent enters the shared
 * cache, and a signed-in reader never triggers the read.
 */
export async function HomeJoinCta() {
  const result = await getGreetingByKey(JOIN_GREETING_KEY);
  const copy = resolveSectionCopy(result, JOIN_COPY);
  const paragraphs = splitParagraphs(copy.text);

  return (
    <HomeSection width="text">
      <div className="flex flex-col items-center gap-6 rounded-card border border-card-border bg-surface p-8 text-center md:p-12">
        <SectionHeading size="large">{copy.heading}</SectionHeading>
        <div className="flex flex-col gap-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-lg/7 whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>
        <ButtonLink href={SIGN_UP_PATH} size="lg">
          {JOIN_COPY.button}
        </ButtonLink>
      </div>
    </HomeSection>
  );
}
