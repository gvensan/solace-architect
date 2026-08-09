/**
 * Capture-rule tuning fixture for the /solace-change change-capture preamble
 * rule (docs/solace-change-skill.md §7, acceptance criteria A1/A2).
 *
 * A transcript-style exchange during /solace-topic-design containing exactly
 * one out-of-scope statement (must be captured as a change request), one
 * in-scope refinement (must NOT be captured; it is a normal D<N> decision for
 * the running skill), and one question (must NOT be captured).
 *
 * Reserved for LLM evaluation runs; checked by hand until then. The stable
 * target: run the exchange against /solace-topic-design and diff
 * open-items.yaml against `expected` below.
 */

export interface CaptureExchange {
  /** Skill active when the operator speaks. */
  activeSkill: string;
  /** Operator utterances, in order. */
  utterances: Array<{
    text: string;
    kind: 'out-of-scope-change' | 'in-scope-refinement' | 'question';
  }>;
}

export interface ExpectedCapture {
  /** Exactly these change requests land in open-items.yaml. */
  changeRequests: Array<{
    verbatim: string;
    suspected_owner: string;
    status: 'pending';
  }>;
}

export const TOPIC_DESIGN_SESSION: CaptureExchange = {
  activeSkill: 'solace-topic-design',
  utterances: [
    {
      // In scope: topic structure is exactly what /solace-topic-design owns.
      // Expected: handled as a normal decision, no change request.
      text: 'Actually, make the region segment come before the version segment.',
      kind: 'in-scope-refinement',
    },
    {
      // Out of scope: payload schema belongs to /solace-event-portal.
      // Expected: captured verbatim as a pending change request.
      text: 'The payment event schema needs a tenantId field, by the way.',
      kind: 'out-of-scope-change',
    },
    {
      // Question, not a statement of intent. Expected: answered, not captured.
      text: 'Should we version the schemas too?',
      kind: 'question',
    },
  ],
};

export const EXPECTED: ExpectedCapture = {
  changeRequests: [
    {
      verbatim: 'The payment event schema needs a tenantId field, by the way.',
      suspected_owner: 'solace-event-portal',
      status: 'pending',
    },
  ],
};
