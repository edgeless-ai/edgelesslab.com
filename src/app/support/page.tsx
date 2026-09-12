import {
  Surface, Main, Container, Heading, Text, Section,
  List, ListItem, Strong, BackLink, InlineLink,
} from "@/components/design-system/primitives";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Support",
  description:
    "Support for Edgeless Lab apps -- The Clapper, photoMerge, and digital products. Contact help@edgelesslab.com.",
  path: "/support",
  keywords: ["Edgeless Lab support", "The Clapper support", "app support"],
});

export default function Support() {
  return (
    <Surface elevation="none">
      <Nav />

      <Main>
        <Container measure="page">
          <BackLink href="/">
            &larr; Edgeless Lab
          </BackLink>

          <Heading kind="title">
            Support
          </Heading>
          <Text variant="subtitle">
            Questions, bug reports, or feature requests -- we&apos;d love to hear from you.
          </Text>

          <Container measure="reading">
            <Text variant="body">
              Email{" "}
              <InlineLink href="mailto:help@edgelesslab.com">
                <Strong>help@edgelesslab.com</Strong>
              </InlineLink>{" "}
              for any Edgeless Lab app or product. We typically respond within
              1&ndash;2 business days.
            </Text>

            <Section spaceAfter="section">
              <Heading kind="section">The Clapper</Heading>
              <Text>
                Hands-free camera control -- clap to record video, take photos,
                flip the camera, and more. All sound detection happens entirely
                on your device: no audio is ever recorded, stored, or
                transmitted, and the app collects no data.
              </Text>
              <Text>Common questions:</Text>
              <List>
                <ListItem>
                  <Strong>Detection feels too sensitive or not sensitive
                  enough</Strong> -- adjust the Sensitivity slider in Settings.
                </ListItem>
                <ListItem>
                  <Strong>Gestures do the wrong thing</Strong> -- every
                  gesture&apos;s action is configurable in Settings &rarr;
                  Gesture Mappings.
                </ListItem>
                <ListItem>
                  <Strong>Microphone or camera access</Strong> -- The Clapper
                  needs mic access to hear claps and camera access to record.
                  You can change these anytime in iOS Settings &rarr; The
                  Clapper.
                </ListItem>
                <ListItem>
                  <Strong>Microphone use</Strong> -- The Clapper only listens
                  while the app is open. The mic is always released when you
                  leave the app.
                </ListItem>
              </List>
            </Section>

            <Section spaceAfter="section">
              <Heading kind="section">photoMerge</Heading>
              <Text>
                Merge and blend photos on iOS. For support, use the email
                above.
              </Text>
            </Section>

            <Section spaceAfter="section">
              <Heading kind="section">Digital Products</Heading>
              <Text>
                Products purchased through Gumroad are delivered by Gumroad.
                If you have download or payment issues, check your Gumroad
                receipt first, then email us and we&apos;ll sort it out.
              </Text>
            </Section>
          </Container>
        </Container>
      </Main>

      <Footer />
    </Surface>
  );
}
