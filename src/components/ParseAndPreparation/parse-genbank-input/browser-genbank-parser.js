// A lightweight GenBank parser that works in the browser from text input

const REGEX = {
  WHITESPACE: /\s/g,
  CHARACTER_AT_BEGINNING: /^(?=[A-Z])/gm,
  CHARACTER_AT_5_SPACES: /^\s{5}(?=\S)/gim,
  WORD_AT_BEGINNING: /^[A-Z]+/,
  WHOLE_LINE: /^.+[\n|\r]*/,
  NEW_LINE_WHITESPACE: /\n\s*/,
  LAST_CHARACTERS: /\S+$/,
  FIRST_WHITESPACE_CHUNK: /\s+/,
  QUOTES_START_OR_END: /(?:^(?:"|')|(?:"|')$)/gm,
  WHITESPACE_PIPES: /\s*\|\s*/gm,
  NON_TEXT: /[^a-z]/gim,
  CHARACTERS_PARENTHESES: /[a-z)(]/gim,
};

function getName(string) {
  const indexOfFirstWhiteSpace = string.trim().search(REGEX.WHITESPACE);
  return string.substr(0, indexOfFirstWhiteSpace);
}

function removeQuotes(string) {
  return string.trim().replace(REGEX.QUOTES_START_OR_END, "");
}

function splitAtFirstCharacter(string, character = ",") {
  const index = string.indexOf(character);
  const key = string.substr(0, index);
  const value = string.substr(index + 1);
  return [key, value];
}

function snake_case(string) {
  return string.toLowerCase().replace(REGEX.NON_TEXT, "_");
}

function informationParsers(key, value, object) {
  switch (key) {
    case "db_xref": {
      const db_xref = object[key] || (object[key] = []);
      db_xref.push(removeQuotes(value));
      break;
    }
    case "nomenclature": {
      const values = removeQuotes(value).split(REGEX.WHITESPACE_PIPES);
      const nomenclature = (object[key] = {});
      for (const string of values) {
        const [k, v] = splitAtFirstCharacter(string, ":");
        nomenclature[snake_case(k)] = v.trim();
      }
      break;
    }
    case "translation": {
      object[key] = removeQuotes(value).replace(REGEX.WHITESPACE, "");
      break;
    }
    default: {
      object[key] = removeQuotes(value);
      break;
    }
  }
}

function parseInformation(information) {
  const object = {};
  for (const string of information) {
    const [key, value] = splitAtFirstCharacter(string, "=");
    informationParsers(key, value, object);
  }
  return object;
}

function parseLocation(location) {
  const isComplement = location.includes("complement");
  const cleanLocation = location
    .replace(/complement\(|\)/g, "")
    .replace(REGEX.CHARACTERS_PARENTHESES, "");
  return cleanLocation
    .replace(/join\(|\)/g, "")
    .split(",")
    .map((string) => {
      const [start, end] = string.split("..");
      return [start, isComplement, end];
    });
}

function parseFeatures(rawFeatures) {
  const features = rawFeatures
    .replace(REGEX.WHOLE_LINE, "")
    .split(REGEX.CHARACTER_AT_5_SPACES)
    .splice(1)
    .map((rawFeature) => {
      const [description, ...splitInformation] = rawFeature.split(
        REGEX.NEW_LINE_WHITESPACE
      );
      const [, ...information] = splitInformation.join(" ").split(/\//gm);
      const [type, location] = description.trim().split(
        REGEX.FIRST_WHITESPACE_CHUNK,
        2
      );
      return {
        type,
        location: parseLocation(location),
        information: parseInformation(information),
      };
    });
  return features;
}

function parseOrigin(rawOrigin) {
  const origin = rawOrigin.toLowerCase().replace(REGEX.NON_TEXT, "").trim();
  return origin;
}

export function parseGenbankText(text) {
  const mapping = text
    .split(REGEX.CHARACTER_AT_BEGINNING)
    .reduce((mapping, string) => {
      const name = getName(string).toLowerCase();
      if (name === "locus") {
        const content = string.replace(REGEX.WORD_AT_BEGINNING, "").trim();
        const match = content.match(
          /^(\S+)\s+(\d+)\s+bp\s+(\S+)(?:\s+(\S+))?(?:\s+(\S+))?\s+(\d{2}-[A-Z]{3}-\d{4})$/
        );
        if (!match) {
          throw new Error("Invalid LOCUS line format");
        }
        const [, locusName, sequenceLength, moleculeType, topology, division, date] = match;
        mapping[name] = {
          locusName,
          sequenceLength: parseInt(sequenceLength, 10),
          moleculeType,
          topology: topology || null,
          division: division || null,
          date,
        };
      } else {
        mapping[name] = string.replace(REGEX.WORD_AT_BEGINNING, "").trim();
      }
      return mapping;
    }, {});
  if (mapping.features) mapping.features = parseFeatures(mapping.features);
  if (mapping.origin) mapping.origin = parseOrigin(mapping.origin);
  return mapping;
}


