import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { DEFAULT_CATEGORIES } from '../scripts/seedCategories.js';

// Get all active categories (with graceful canonical fallback)
export const getCategories = async (req, res, next) => {
  try {
    let categories = [];
    if (mongoose.connection.readyState === 1) {
      categories = await Category.find({});
    }
    if (!categories || categories.length === 0) {
      categories = DEFAULT_CATEGORIES;
    }
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    // Graceful fallback to default canonical categories
    return res.status(200).json({ success: true, data: DEFAULT_CATEGORIES });
  }
};

// Create a category
export const createCategory = async (req, res, next) => {
  try {
    const { name, emoji, keyword, googleType, status } = req.body;
    if (!name || !emoji || !keyword) {
      return res.status(400).json({ success: false, message: 'Name, Emoji, and Keyword are required.' });
    }
    const category = await Category.create({ 
      name, 
      emoji, 
      keyword, 
      googleType, 
      status: status || 'Active' 
    });
    return res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Update a category
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, emoji, keyword, googleType, status } = req.body;
    const category = await Category.findByIdAndUpdate(
      id,
      { name, emoji, keyword, googleType, status },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// Delete a category
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
