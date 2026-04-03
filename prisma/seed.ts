import { PrismaClient, MistakeStatus } from "@prisma/client";

const prisma = new PrismaClient();

const examples = [
  {
    language: "Spanish",
    learnerPrompt:
      "Help me understand why this Duolingo answer is wrong: I wrote 'Yo gusto manzanas' for 'I like apples.'",
    question: 'Translate: "I like apples."',
    userAnswer: "Yo gusto manzanas.",
    correctAnswer: "Me gustan las manzanas.",
    errorType: "verb structure",
    aiAnswer:
      "在西班牙语里，gustar 的结构不是“我喜欢苹果”，而更接近“苹果让我喜欢”。所以要说 Me gustan las manzanas，而不是 Yo gusto manzanas。",
    chatTranscriptJson: JSON.stringify([
      {
        role: "user",
        content:
          "Help me understand why this Duolingo answer is wrong: I wrote 'Yo gusto manzanas' for 'I like apples.'"
      },
      {
        role: "assistant",
        content:
          "在西班牙语里，gustar 的结构不是“我喜欢苹果”，而更接近“苹果让我喜欢”。所以要说 Me gustan las manzanas，而不是 Yo gusto manzanas。"
      }
    ]),
    status: MistakeStatus.needs_review,
    aiExplanationJson: JSON.stringify({
      grammarConcept: "The verb gustar works like 'to be pleasing' rather than 'to like.'",
      whyUserAnswerIsWrong: "Spanish does not use gustar with the speaker as the subject in this sentence, so 'Yo gusto manzanas' is not the natural structure.",
      whyCorrectAnswerIsCorrect: "In 'Me gustan las manzanas,' apples are the thing doing the pleasing, and 'me' marks the person who likes them.",
      shortRule: "Use an indirect object pronoun plus gustar, and match the verb to the thing liked.",
      exampleSentences: [
        "Me gusta el cafe.",
        "Nos gustan los libros."
      ],
      practiceQuestion: 'How would you say: "She likes music"?'
    })
  },
  {
    language: "English",
    learnerPrompt:
      'Explain why "I have went to the store yesterday" is wrong and what tense I should use instead.',
    question: 'Choose the correct sentence for a finished action yesterday.',
    userAnswer: "I have went to the store yesterday.",
    correctAnswer: "I went to the store yesterday.",
    errorType: "verb tense",
    aiAnswer:
      "这里要用一般过去时而不是现在完成时，因为 yesterday 是一个明确结束的过去时间，而且 have 后面也不能接 went。",
    chatTranscriptJson: JSON.stringify([
      {
        role: "user",
        content:
          'Explain why "I have went to the store yesterday" is wrong and what tense I should use instead.'
      },
      {
        role: "assistant",
        content:
          "这里要用一般过去时而不是现在完成时，因为 yesterday 是一个明确结束的过去时间，而且 have 后面也不能接 went。"
      }
    ]),
    status: MistakeStatus.new,
    aiExplanationJson: JSON.stringify({
      grammarConcept: "Simple past vs. present perfect",
      whyUserAnswerIsWrong: "Present perfect is not typically used with a finished time expression like 'yesterday,' and 'went' cannot follow 'have.'",
      whyCorrectAnswerIsCorrect: "Simple past fits a completed action at a specific past time.",
      shortRule: "Use simple past with clear finished time markers such as yesterday, last week, or in 2024.",
      exampleSentences: [
        "She finished her homework last night.",
        "We saw that movie on Friday."
      ],
      practiceQuestion: 'Which is correct: "I have seen her yesterday" or "I saw her yesterday"?'
    })
  },
  {
    language: "Japanese",
    learnerPrompt:
      'Why do we say "バスで学校に行きました" instead of using を after バス here?',
    question: 'Say: "I went to school by bus."',
    userAnswer: "私はバスを学校に行きました。",
    correctAnswer: "私はバスで学校に行きました。",
    errorType: "particle choice",
    aiAnswer:
      "这里要用 で 表示交通方式，而不是 を。バスで学校に行きました 的意思是“坐公交去学校”。",
    chatTranscriptJson: JSON.stringify([
      {
        role: "user",
        content:
          'Why do we say "バスで学校に行きました" instead of using を after バス here?'
      },
      {
        role: "assistant",
        content:
          "这里要用 で 表示交通方式，而不是 を。バスで学校に行きました 的意思是“坐公交去学校”。"
      }
    ]),
    status: MistakeStatus.mastered,
    aiExplanationJson: JSON.stringify({
      grammarConcept: "Particle choice for means of transportation",
      whyUserAnswerIsWrong: "The particle を marks a direct object, but bus is the means used to go, not the object of the verb.",
      whyCorrectAnswerIsCorrect: "The particle で shows the method or tool used for the action.",
      shortRule: "Use で to express the means of transportation or method.",
      exampleSentences: [
        "電車で会社に行きます。",
        "自転車で公園に行きました。"
      ],
      practiceQuestion: 'How would you say: "I came by train"?'
    })
  }
];

async function main() {
  await prisma.mistake.deleteMany();
  await prisma.mistake.createMany({ data: examples });

  const vocabCount = await prisma.vocabularyEntry.count({ where: { isDeleted: false } });
  if (vocabCount === 0) {
    await prisma.vocabularyEntry.createMany({
    data: [
      {
        language: "Spanish",
        learnerPrompt: "Dejamos",
        term: "Dejamos",
        aiAnswer:
          "dejamos 来自动词 dejar，可以表示“我们留下 / 我们离开 / 我们让”，还可能是现在时或简单过去时，要结合上下文判断。",
        chatTranscriptJson: JSON.stringify([
          { role: "user", content: "Dejamos" },
          {
            role: "assistant",
            content:
              "dejamos 来自动词 dejar，可以表示“我们留下 / 我们离开 / 我们让”，还可能是现在时或简单过去时，要结合上下文判断。"
          }
        ]),
        isSimpleWord: true
      },
      {
        language: "Japanese",
        learnerPrompt: "しらべる",
        term: "調べる",
        aiAnswer:
          "調べる（しらべる）表示调查、查一下、检索，常见搭配有 意味を調べる、原因を調べる。",
        chatTranscriptJson: JSON.stringify([
          { role: "user", content: "しらべる" },
          {
            role: "assistant",
            content:
              "調べる（しらべる）表示调查、查一下、检索，常见搭配有 意味を調べる、原因を調べる。"
          }
        ]),
        isSimpleWord: true
      }
    ]
  });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
