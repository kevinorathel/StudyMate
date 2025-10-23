import { Section } from "./Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  return (
    <Section id="faq" className="py-12">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
        Frequently asked questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Is this free to use?</AccordionTrigger>
          <AccordionContent>
            Yes—during alpha there’s no cost. We’ll consider modest student
            pricing later.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>What file types are supported?</AccordionTrigger>
          <AccordionContent>
            We currently support PDF and DOCX uploads. Additional formats are on
            the roadmap.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Do you store my files?</AccordionTrigger>
          <AccordionContent>
            Files are processed transiently for generation and can be removed
            immediately after. We’ll add a per-notebook setting for opt-in
            retention.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Section>
  );
}
