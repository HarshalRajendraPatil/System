const MOCK_FORMAT = {
  DSA: 'dsa',
  SYSTEM_DESIGN: 'system_design',
  BEHAVIORAL: 'behavioral',
  MIXED: 'mixed',
};

const MOCK_FORMAT_ORDER = [
  MOCK_FORMAT.DSA,
  MOCK_FORMAT.SYSTEM_DESIGN,
  MOCK_FORMAT.BEHAVIORAL,
  MOCK_FORMAT.MIXED,
];

const INTERVIEWER_TYPE = {
  SELF: 'self',
  PEER: 'peer',
  MENTOR: 'mentor',
  AI: 'ai',
  PANEL: 'panel',
};

const INTERVIEWER_TYPE_ORDER = [
  INTERVIEWER_TYPE.SELF,
  INTERVIEWER_TYPE.PEER,
  INTERVIEWER_TYPE.MENTOR,
  INTERVIEWER_TYPE.AI,
  INTERVIEWER_TYPE.PANEL,
];

const MOCK_SECTION_KEYS = [
  'coding',
  'problemSolving',
  'systemDesign',
  'communication',
  'behavioral',
];

module.exports = {
  INTERVIEWER_TYPE,
  INTERVIEWER_TYPE_ORDER,
  MOCK_FORMAT,
  MOCK_FORMAT_ORDER,
  MOCK_SECTION_KEYS,
};
