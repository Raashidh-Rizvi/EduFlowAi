/**
 * Mirrors of the backend domain enums (backend/EduFlow.Core/Enums/DomainEnums.cs).
 *
 * The API serializes these enums as numbers and only accepts numbers in request bodies,
 * so every request and every response mapping must go through these tables instead of
 * hand-written literals. Keep the numeric values in the same order as the C# enums.
 */

export const QUIZ_SCOPE_TYPE = Object.freeze({
  Topic: 0,
  ContentItem: 1,
  Module: 2,
  Course: 3,
});

export const QUESTION_TYPE = Object.freeze({
  MultipleChoice: 0,
  MultipleSelect: 1,
  TrueFalse: 2,
  ShortAnswer: 3,
  FillInBlank: 4,
  Matching: 5,
  Ordering: 6,
  ScenarioBased: 7,
  TimedChallenge: 8,
  CodeSnippet: 9,
  OpenEnded: 10,
  Numerical: 11,
});

export const QUIZ_STATUS = Object.freeze({
  Draft: 0,
  AiGenerating: 1,
  Validating: 2,
  ReadyForReview: 3,
  Approved: 4,
  Published: 5,
  RevisionRequested: 6,
  Rejected: 7,
  Unpublished: 8,
  Archived: 9,
  Failed: 10,
});

const nameOf = (table, value) =>
  typeof value === 'string' ? value : Object.keys(table).find((k) => table[k] === value);

/** Numeric API value for a scope name ('Module') or pass-through for a number. */
export const toScopeTypeValue = (scope) =>
  typeof scope === 'number' ? scope : QUIZ_SCOPE_TYPE[scope] ?? QUIZ_SCOPE_TYPE.Module;

/** Question type name ('ShortAnswer') for a numeric API value or a name. */
export const questionTypeName = (type) => nameOf(QUESTION_TYPE, type) ?? 'MultipleChoice';

/** Numeric API value for a question type name or pass-through for a number. */
export const toQuestionTypeValue = (type) =>
  typeof type === 'number' ? type : QUESTION_TYPE[type] ?? QUESTION_TYPE.MultipleChoice;
