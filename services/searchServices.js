/* eslint-disable no-underscore-dangle */
const axios = require('axios').default;
const { Search } = require('../models/searchModel.js');
const { User } = require('../models/userModel.js');
const { ObjectId } = require('mongoose').Types;

const { permittedKeywords } = require('./data/permittedKeywords');
const { permittedLocations } = require('./data/permittedLocations');

/**
 * Build query string, sanitise as needed and encode
 * @param {Object} query Only keywords, locationName and distanceFromLocation are used.
 * @return {Object} Returns a Encoded and sanitised query string, and also an object version.
 */
const prepareQuery = (query) => {
  const cleanQuery = query;

  cleanQuery.distanceFromLocation = cleanseDistance(cleanQuery.distanceFromLocation);

  cleanQuery.keywords = cleanseKeywords(cleanQuery.keywords);

  // Validate location exists in pre-defined list, if not default to london
  if (!permittedLocations.includes(cleanQuery.locationName.toLowerCase())) cleanQuery.locationName = 'london';

  // Encoded query
  const queryToEncode = `keywords=${cleanQuery.keywords}&locationName=${
    cleanQuery.locationName}&distanceFromLocation=${cleanQuery.distanceFromLocation}`;

  return { encodedQuery: encodeURI(queryToEncode), cleanQueryObject: cleanQuery };
};

/**
 * Review the number provided and default (to 10) or round it as required
 * @param {Number} distance Value for the search distance (miles).
 * @return {Number} Returns a distance value.
 */
const cleanseDistance = (distance) => {
  const distanceFromLocationAsFloat = parseFloat(distance, 10);

  if (Number.isNaN(distanceFromLocationAsFloat)) {
    return 10;
  }

  const distanceRoundedAndTruncated = Math.trunc(Math.round(distanceFromLocationAsFloat));

  return distanceRoundedAndTruncated;
};

/**
 * Take the string of keywords, ensure they match the list of permitted words and return clean
 * @param {String} keywords Search terms provided by the user.
 * @return {String} Returns a cleansed version of the search terms.
 */
const cleanseKeywords = (keywords) => {
  const keywordsArray = keywords.split(' ');
  keywordsArray.sort();
  let keywordsToReturn = '';

  keywordsArray.forEach((keyword) => {
    if (permittedKeywords.includes(keyword.toLowerCase())) {
      keywordsToReturn += `${keyword} `;
    }
  });

  keywordsToReturn = keywordsToReturn.trim();

  return keywordsToReturn;
};

/**
 * Search reed using the jobseeker API (https://www.reed.co.uk/developers/jobseeker)
 * @param {Object} query Only keywords, locationName and distanceFromLocation are used.
 * @return {Object} First page of query results from reed API
 */
const searchReed = async (query) => {
  // Request data from reed, per their API documentation Basic Auth is used
  // and the issued key is provided as the username, password is left blank.
  try {
    const response = await axios({
      method: 'get',
      baseURL: 'https://www.reed.co.uk',
      url: `/api/1.0/search?${prepareQuery(query).encodedQuery}`,
      headers: {
        Authorization: `Basic ${process.env.REED_B64}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error(error);
  }

  // If we hit an error we return nothing
  return { totalResults: 0 };
};

/**
 * Pushes a saved search ID to the user's document
 * @param {Object} userId The userId for the user who initiated the request.
 * @param {Object} searchId The ID of the saved search
 * @return {Object} Returns a response code and message.
 */
const pushSearchToUser = async (userId, searchId) => {
  try {
    const user = await User.findByIdAndUpdate(userId, {
      $push: { savedSearches: searchId },
    }).exec();
    return { code: 200, msg: 'search saved to user profile' };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
};

/**
 * Finds saved search if it exists, creates it if it doesn't. In either case saves it to user.
 * @param {Object} req The full POST request sent by the user.
 * @return {Object} Returns a response code and message.
 */
const saveSearch = async (req) => {
  const { cleanQueryObject } = prepareQuery(req.body);

  // If another user has already saved this search it will be returned and the array length will
  // be greater than 0, if the user already has it saved then it will not be added again
  const existingRecord = await Search.find({ searchTerms: cleanQueryObject }).exec();
  const user = await User.findById({ _id: req.user._id }).exec();

  if (existingRecord.length > 0) {
    if (user.savedSearches.includes(existingRecord[0]._id)) {
      return { code: 409, msg: 'user has already saved this search' };
    }

    const response = await pushSearchToUser(req.user._id, existingRecord[0]._id);
    return response;
  }

  // As the search doesn't exist, save it and add it to the user's saved searches
  const search = new Search({ searchTerms: cleanQueryObject });

  try {
    const savedSearch = await search.save();
    const response = await pushSearchToUser(req.user._id, savedSearch._id);
    return response;
  } catch (err) {
    return { code: 500, msg: err.message };
  }
};

/**
 * Deletes a given saved search id from a user's saved search list
 * @param {Object} req The DELETE request sent by the user, including the search id to delete
 * @return {Object} Returns a response code and message.
 */
const deleteUserSavedSearch = async (req) => {
  try {
    const user = await User.findById({ _id: req.user._id }).exec();

    if (user.savedSearches.includes(ObjectId(req.params.id))) {
      await user.savedSearches.pull(ObjectId(req.params.id));
      await user.save();
      return { code: 200, msg: 'user saved search removed' };
    }

    return { code: 404, msg: 'search does not exist in user saved searches' };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
};

/**
 * Returns an array of saved searches for a given user or a message if there are no saved searches
 * @param {Object} userId The User ID for the user requesting their saved searches
 * @return {Object} Returns an object containing a response code and message, also sends the
 * data in an array if saved searches exist.
 */
const getUserSavedSearches = async (userId) => {
  try {
    const user = await User.findById({ _id: userId }).populate('savedSearches').exec();
    if (user.savedSearches.length > 0) {
      return {
        code: 200,
        msg: 'saved searches found for user',
        savedSearches: user.savedSearches,
      };
    }

    return { code: 200, msg: 'no saved searches for user' };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
};

/**
 * Returns an array of searches from the Searches collection, these are not user specific
 * @return {Object} Returns an object containing a response code and message, also sends the
 * data in an array.
 */
const getTrendingSearches = async () => {
  try {
    const searches = await Search.find({}).limit(3).exec();
    return {
      code: 200,
      msg: 'trending searches found',
      trendingSearches: searches,
    };
  } catch (err) {
    return { code: 500, msg: err.message };
  }
};

module.exports = {
  searchReed,
  prepareQuery,
  saveSearch,
  pushSearchToUser,
  deleteUserSavedSearch,
  getUserSavedSearches,
  getTrendingSearches
};
