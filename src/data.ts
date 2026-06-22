import { StudySuite } from "./types";

export const demoStudyGuide: StudySuite = {
  title: "Active Recall & Spaced Repetition",
  description: "A comprehensive guide on the dual pillars of cognitive psychology: testing yourself frequently and dividing study sessions over time to maximize long-term factual retention and outperform standard re-reading.",
  keyTakeaways: [
    "Cognitive science shows that learning is not passive reading, but active retrieval: pulling information OUT of your brain makes memories stick.",
    "The forgetting curve (discovered by Hermann Ebbinghaus) proves memories decay exponentially over days unless reinforced at strategic, spaced intervals.",
    "Feynman technique translates high-level abstract jargon into plain-English metaphors, exposing weak spots in comprehension.",
    "Active recall triggers 'desirable difficulty', forcing neural pathways to strengthen through cognitive struggle."
  ],
  terminology: [
    {
      term: "Active Recall",
      definition: "An active learning strategy where the learner tests themselves on concepts, forcing the cognitive retrieval of information from memory.",
      context: "Using flashcards instead of highlighting a textbook is a classic usage of active recall."
    },
    {
      term: "Spaced Repetition",
      definition: "An educational framework where study sessions are scheduled at increasing intervals of time to minimize decay according to the forgetting curve.",
      context: "Reviewing a vocabulary word after 1 day, then 3 days, then 10 days, then 30 days is spaced repetition."
    },
    {
      term: "Ebbinghaus Forgetting Curve",
      definition: "A mathematical graph showing how fast newly acquired memories decay in the human brain without active review.",
      context: "Within 48 hours of reading an article passively, humans forget roughly 70% of the concepts, demonstrating the steep slope."
    },
    {
      term: "Desirable Difficulty",
      definition: "A learning task that requires more cognitive effort, resulting in superior long-term memory encoding and conceptual flexibility.",
      context: "Solving practice problems without checking the answer sheet introduces a desirable difficulty that triggers real growth."
    }
  ],
  outline: [
    {
      heading: "1. The Tragedy of Passive Review",
      keyPoints: [
        "Passive reviewing includes re-reading, underlining text, or sitting through standard lecture recordings.",
        "Generates the 'illusion of competence': matching recognition with actual memory retrieval, giving students false confidence."
      ],
      subtopics: [
        {
          heading: "Recognition vs. Recall",
          keyPoints: [
            "Recognition is identifying text when it is physically right in front of you.",
            "Recall is retrieving the definition from scratch dynamically from long-term memory buffers."
          ]
        }
      ]
    },
    {
      heading: "2. Hermann Ebbinghaus & The Memory Curve",
      keyPoints: [
        "Memory recall decays exponentially over time immediately after learning.",
        "To flatten the decay curve, we must interrupt the forgetfulness through timed active recall sessions."
      ],
      subtopics: [
        {
          heading: "Leitner Box System",
          keyPoints: [
            "A physical card separation technique where card boxes represent study intervals (e.g. Daily, every 3 days, weekly).",
            "Missed cards return back to Box 1, maintaining intense pressure on weaker concepts."
          ]
        }
      ]
    }
  ],
  feynmanExplanation: "Imagine your brain is a giant jungle, and memories are campsites hidden deep inside. Passive review is like sitting on a helicopter, looking down at a campsite. You think, 'Aha, I know exactly where that is!' But when you land, you get lost because there's no actual trail. Active recall is like walking on foot from the entrance to the campsite. The first time, it's incredibly tough and you fight through branches. But each time you walk that exact path, you stomp down the weeds and leave a clear, permanent trail. Spaced repetition is walking the path just before the weeds start growing back, keeping the trail open forever with the least possible total walking trips.",
  flashcards: [
    {
      question: "What is the Ebbinghaus forgetting curve?",
      answer: "A mathematical graph showing how memory retrieval drops off steeply and exponentially if not actively reinforced with spaced memory triggers.",
      hint: "Think about how quickly you forget a phone number over days if you don't repeat it."
    },
    {
      question: "What is the 'illusion of competence' in study psychology?",
      answer: "The false feeling of knowing a subject well because details are easily recognized while reading, although they cannot be actively retrieved from memory on an exam.",
      hint: "It's the difference between recognizing a song and singing it perfectly from scratch."
    },
    {
      question: "Explain ‘desirable difficulty’.",
      answer: "A educational task that feels harder to perform initially (like testing yourself instead of highlighting) but triggers much deeper retention and stronger neural connections.",
      hint: "Think about lifting heavier weights for muscle growth; it's a parallel concept for the brain."
    },
    {
      question: "What physical method did Sebastian Leitner invent for spaced repetition?",
      answer: "The Leitner Box System, where flashcards are stacked in different boxes representing different check frequencies, penalizing errors by demoting those cards.",
      hint: "A series of physical cardboard card-holders sorted to prioritize difficult cards."
    }
  ],
  quiz: [
    {
      id: "q1",
      question: "Which of the following methods produces the HIGHEST factual recall rates according to cognitive science?",
      options: [
        "Re-reading a chapter three times consecutively",
        "Self-testing via prompt metrics and flashcards",
        "Extensively highlighting key paragraphs with clear neon colors",
        "Reading summarized companion sheets curated by a teacher"
      ],
      correctAnswerIndex: 1,
      explanation: "Passive highlights, re-reading, and studying readymade sheets don't force the brain to actively retrieve information. Self-testing creates the neural friction required to lock concepts in."
    },
    {
      id: "q2",
      question: "What occurs to the forgetting curve when you schedule a study session exactly during natural memory decay?",
      options: [
        "The curve drops even faster as you confuse your brain",
        "The curve locks at 100% permanently without any subsequent reviews",
        "The slope of the forgetting curve flattens, making memories decay slower than before",
        "It causes cognitive fatigue, forcing your brain to purge previous concepts"
      ],
      correctAnswerIndex: 2,
      explanation: "Each strategic review interrupts memory decay and significantly flattens the curve's downward trajectory. Spacings expand, meaning you can wait longer before the next review session."
    },
    {
      id: "q3",
      question: "Why does passive reading feel easier and more enjoyable than flashcard testing?",
      options: [
        "Because human eyes process books more efficiently than single flashcards",
        "Passive reading relies solely on recognition, which avoids neural friction (illusions of competence)",
        "Because textbooks are naturally written with scientifically superior font types",
        "Active recall triggers stress hormones that actively degrade cell connectivity"
      ],
      correctAnswerIndex: 1,
      explanation: "Recognition uses minimal mental energy, creating an 'illusion of competence' where because you recognize the words, you think you've learned them. Recall requires heavy search efforts which feel harder but yield genuine mastery."
    }
  ]
};
