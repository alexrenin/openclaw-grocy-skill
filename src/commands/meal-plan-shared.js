'use strict';

const { normalizeText, parsePositiveInteger } = require('./product-create');
const { resolveRecipeObject } = require('./recipe-update');
const { isReadableRecipe } = require('./recipes');

function parseDate(value, optionName = '--date') {
  const text = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${optionName} must be a date in YYYY-MM-DD format`);
  }

  const date = new Date(`${text}T00:00:00Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error(`${optionName} must be a valid calendar date`);
  }

  return text;
}

function parseOptionalDate(value, optionName) {
  if (value == null || value === '') {
    return undefined;
  }

  return parseDate(value, optionName);
}

function resolveMealPlanSection({ idValue, nameValue, sections = [], required = false }) {
  if (idValue && nameValue) {
    throw new Error('Specify either --section-id or --section, not both.');
  }

  if (idValue) {
    return parsePositiveInteger(idValue, '--section-id');
  }

  const name = normalizeText(nameValue);

  if (!name) {
    if (required) {
      throw new Error(`Missing required option: --section or --section-id. Available sections: ${formatSectionChoices(sections)}`);
    }

    return undefined;
  }

  const matches = (sections || []).filter((section) => normalizeTerm(section.name) === normalizeTerm(name));

  if (matches.length === 1) {
    return Number(matches[0].id);
  }

  if (matches.length > 1) {
    throw new Error(`Ambiguous meal plan section: ${name}. Matches: ${formatSectionChoices(matches)}`);
  }

  throw new Error(`Unknown meal plan section: ${name}. Available sections: ${formatSectionChoices(sections)}`);
}

function buildMealPlanRecipePayload({ date, recipeId, sectionId, note }) {
  const payload = {
    day: date,
    type: 'recipe',
    recipe_id: recipeId,
  };

  if (sectionId !== undefined) {
    payload.section_id = sectionId;
  }

  if (note !== undefined) {
    payload.note = normalizeText(note);
  }

  return payload;
}

function buildCurrentMealPlanPayload(entry) {
  const payload = {
    day: entry.day,
    type: entry.type || 'recipe',
  };

  copyExistingField(entry, payload, 'recipe_id');
  copyExistingField(entry, payload, 'product_id');
  copyExistingField(entry, payload, 'note');
  copyExistingField(entry, payload, 'section_id');

  return payload;
}

function normalizeMealPlanEntries(entries = [], recipes = [], sections = []) {
  const recipesById = mapById(recipes);
  const sectionsById = mapById(sections);

  return (entries || [])
    .map((entry) => normalizeMealPlanEntry(entry, recipesById, sectionsById))
    .sort((left, right) => left.date.localeCompare(right.date) || left.id - right.id);
}

function normalizeMealPlanEntry(entry, recipesById, sectionsById) {
  const recipeId = entry.recipe_id == null ? undefined : Number(entry.recipe_id);
  const rawSectionId = entry.section_id == null ? undefined : Number(entry.section_id);
  const sectionId = rawSectionId > 0 ? rawSectionId : undefined;

  return {
    id: Number(entry.id),
    date: entry.day || '',
    type: entry.type || '',
    recipe_id: recipeId ?? '',
    recipe_name: recipeId == null ? '' : recipesById.get(recipeId)?.name || '',
    section_id: sectionId ?? '',
    section_name: sectionId == null ? '' : sectionsById.get(sectionId)?.name || '',
    note: entry.note || '',
  };
}

function filterMealPlanEntries(entries, { from, to } = {}) {
  return (entries || []).filter((entry) => {
    if (from && entry.date < from) {
      return false;
    }

    if (to && entry.date > to) {
      return false;
    }

    return true;
  });
}

function resolveRecipeForMealPlan({ recipes, idValue, nameValue }) {
  return resolveRecipeObject({
    idValue,
    nameValue,
    recipes: (recipes || []).filter(isReadableRecipe),
  });
}

function formatSectionChoices(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return 'none';
  }

  return sections
    .map((section) => `${section.id}:${normalizeText(section.name) || 'unnamed'}`)
    .join(', ');
}

function normalizeTerm(value) {
  return normalizeText(value).toLowerCase();
}

function copyExistingField(source, target, fieldName) {
  if (source[fieldName] !== undefined) {
    target[fieldName] = source[fieldName];
  }
}

function mapById(items) {
  return new Map((items || []).map((item) => [Number(item.id), item]));
}

module.exports = {
  buildCurrentMealPlanPayload,
  buildMealPlanRecipePayload,
  filterMealPlanEntries,
  normalizeMealPlanEntries,
  parseDate,
  parseOptionalDate,
  resolveMealPlanSection,
  resolveRecipeForMealPlan,
};
