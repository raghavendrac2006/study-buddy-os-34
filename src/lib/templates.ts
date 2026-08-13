export type TemplateDay = { topic: string; subtopics: string[]; minutes: number };

export type SubjectTemplate = {
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  days: TemplateDay[];
};

const d = (topic: string, subtopics: string[], minutes = 60): TemplateDay => ({
  topic,
  subtopics,
  minutes,
});

export const SUBJECT_TEMPLATES: SubjectTemplate[] = [
  {
    name: "Java",
    description: "Core Java from syntax to OOP and collections.",
    icon: "Coffee",
    color: "amber",
    category: "Programming",
    difficulty: "medium",
    days: [
      d("Java basics", ["Setup & JDK", "Hello World", "Variables", "Data types"], 90),
      d("Operators & conditionals", ["Arithmetic", "Logical", "if / else", "switch"], 90),
      d("Loops", ["for", "while", "do-while", "Practice problems"], 90),
      d("Arrays & strings", ["1D arrays", "2D arrays", "String methods"], 90),
      d("Methods", ["Parameters", "Return types", "Overloading", "Recursion intro"], 90),
      d("OOP part 1", ["Classes", "Objects", "Constructors", "this"], 90),
      d("OOP part 2", ["Inheritance", "Polymorphism", "Abstraction", "Interfaces"], 120),
      d("Exception handling", ["try/catch", "finally", "Custom exceptions"], 90),
      d("Collections", ["List", "Set", "Map", "Iterators"], 120),
      d("Review & mini project", ["Revision", "Build a small CLI app"], 120),
    ],
  },
  {
    name: "Python",
    description: "Python fundamentals through to files and libraries.",
    icon: "Code2",
    color: "sky",
    category: "Programming",
    difficulty: "easy",
    days: [
      d("Python basics", ["Setup", "Variables", "Types", "Input/output"], 60),
      d("Control flow", ["if/elif/else", "Loops", "Comprehensions"], 60),
      d("Data structures", ["Lists", "Tuples", "Sets", "Dicts"], 90),
      d("Functions", ["Args & kwargs", "Scope", "Lambdas"], 60),
      d("OOP in Python", ["Classes", "Inheritance", "Dunder methods"], 90),
      d("Files & errors", ["Reading/writing", "try/except", "Context managers"], 60),
      d("Standard library", ["datetime", "collections", "itertools"], 60),
      d("Mini project", ["Build a small tool", "Refactor"], 120),
    ],
  },
  {
    name: "DSA",
    description: "Data structures and algorithms for interviews.",
    icon: "Binary",
    color: "violet",
    category: "Computer Science",
    difficulty: "hard",
    days: [
      d("Complexity analysis", ["Big-O", "Time vs space", "Common patterns"], 60),
      d("Arrays", ["Two pointers", "Prefix sums", "5 problems"], 120),
      d("Strings", ["Sliding window", "Hashing", "5 problems"], 120),
      d("Linked lists", ["Reversal", "Cycle detection", "Merge"], 120),
      d("Stacks & queues", ["Monotonic stack", "BFS queue", "Problems"], 120),
      d("Hashing", ["Hash maps", "Frequency counting", "Problems"], 90),
      d("Recursion & backtracking", ["Subsets", "Permutations", "N-Queens"], 120),
      d("Trees", ["Traversals", "BST", "Depth problems"], 120),
      d("Graphs", ["BFS", "DFS", "Topological sort"], 120),
      d("Dynamic programming", ["Memoisation", "Tabulation", "Classic problems"], 120),
    ],
  },
  {
    name: "Aptitude",
    description: "Quantitative aptitude for placements.",
    icon: "Calculator",
    color: "emerald",
    category: "Aptitude",
    difficulty: "medium",
    days: [
      d("Number systems", ["Divisibility", "HCF & LCM", "Remainders"], 45),
      d("Percentages", ["Basics", "Increase/decrease", "Word problems"], 45),
      d("Profit & loss", ["Cost/selling price", "Discount", "Practice set"], 45),
      d("Ratio & proportion", ["Ratios", "Partnership", "Mixtures"], 45),
      d("Averages", ["Simple average", "Weighted average", "Practice"], 45),
      d("Time & work", ["Work rate", "Pipes & cisterns", "Practice"], 60),
      d("Time, speed & distance", ["Relative speed", "Trains", "Boats"], 60),
      d("Interest", ["Simple interest", "Compound interest"], 45),
      d("Probability & P&C", ["Permutations", "Combinations", "Probability"], 60),
      d("Data interpretation", ["Tables", "Bar & pie charts", "Timed set"], 60),
    ],
  },
  {
    name: "Reasoning",
    description: "Logical reasoning practice by topic.",
    icon: "Brain",
    color: "rose",
    category: "Aptitude",
    difficulty: "medium",
    days: [
      d("Series", ["Number series", "Letter series"], 45),
      d("Coding-decoding", ["Letter coding", "Number coding"], 45),
      d("Blood relations", ["Family trees", "Coded relations"], 45),
      d("Directions", ["Direction sense", "Distance problems"], 45),
      d("Seating arrangement", ["Linear", "Circular"], 60),
      d("Puzzles", ["Floor puzzles", "Scheduling puzzles"], 60),
      d("Syllogisms", ["Venn diagrams", "Statements & conclusions"], 45),
      d("Analogies & classification", ["Word analogies", "Odd one out"], 45),
    ],
  },
  {
    name: "DBMS",
    description: "Database fundamentals and SQL.",
    icon: "Database",
    color: "teal",
    category: "Computer Science",
    difficulty: "medium",
    days: [
      d("DBMS intro", ["Architecture", "ER model"], 60),
      d("Relational model", ["Keys", "Relational algebra"], 60),
      d("SQL basics", ["SELECT", "WHERE", "ORDER BY"], 60),
      d("SQL joins", ["Inner/outer joins", "Subqueries"], 60),
      d("Normalisation", ["1NF-3NF", "BCNF"], 60),
      d("Transactions", ["ACID", "Concurrency", "Locks"], 60),
      d("Indexing", ["B+ trees", "Hash indexes"], 60),
    ],
  },
  {
    name: "Operating Systems",
    description: "Core OS concepts for interviews.",
    icon: "Cpu",
    color: "slate",
    category: "Computer Science",
    difficulty: "medium",
    days: [
      d("OS intro", ["Kernel", "System calls"], 60),
      d("Processes", ["States", "Scheduling algorithms"], 60),
      d("Threads", ["Concurrency", "Context switching"], 60),
      d("Synchronisation", ["Mutex", "Semaphores", "Deadlocks"], 60),
      d("Memory management", ["Paging", "Segmentation"], 60),
      d("Virtual memory", ["Page replacement", "Thrashing"], 60),
      d("File systems", ["Allocation", "Disk scheduling"], 60),
    ],
  },
];
