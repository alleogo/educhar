const Category = require("../models/Category");
const Course = require("../models/Course");
const mongoose = require("mongoose");

// Fields of an instructor that are safe to expose on public endpoints
const PUBLIC_USER_FIELDS = "firstName lastName image accountType";

// createCategory handler
exports.createCategory = async (req, res) => {
    try {
        // fetch data
        const { name, description } = req.body

        // validation
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        // create entry in DB
        const categoryDetails = await Category.create({
            name: name,
            description: description
        });

        //return response
        return res.status(200).json({
            success: true,
            message: "Category created successfully."
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
}

// getAllCategoriess
exports.showAllCategories = async (req, res) => {
    try {
        const allCategories = await Category.find({}, { name: true, description: true });
        return res.status(200).json({
            success: true,
            message: "All Categories returned successfully.",
            allCategories
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
}


// categoryPageDetails
exports.categoryPageDetails = async (req, res) => {
    try {
        // get category ID
        const categoryId = req.body?.categoryId || req.query?.categoryId;
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ success: false, message: "Invalid category id." });
        }

        // get courses for specified category ID
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "course",
                populate: {
                    path: "instructor",
                    select: PUBLIC_USER_FIELDS
                }
            }).exec();

        // validation
        if (!selectedCategory) {
            return res.status(404).json({
                success: false,
                message: "Data not found!"
            });
        }

        // get courses for other categories
        const differentCategories = await Category.find({ _id: { $ne: categoryId } })
            .populate({
                path: "course",
                populate: {
                    path: "instructor",
                    select: PUBLIC_USER_FIELDS
                }
            }).exec();

        // get top selling courses, ranked by NUMBER of enrolled students.
        // (.sort({ enrolledStudents: -1 }) sorted by the array's element values, not its length)
        const topSellingCourses = await Course.aggregate([
            { $addFields: { enrolledCount: { $size: { $ifNull: ["$enrolledStudents", []] } } } },
            { $sort: { enrolledCount: -1, _id: 1 } },
            { $limit: 10 },
            { $lookup: {
                from: "users",
                localField: "instructor",
                foreignField: "_id",
                as: "instructor",
                pipeline: [{ $project: { firstName: 1, lastName: 1, image: 1, accountType: 1 } }]
            } },
            { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
            { $project: { enrolledStudents: 0 } }   // publish the count, not student IDs
        ]);

        // return response
        return res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategories,
                topSellingCourses
            }
        });
    }
    catch (error) {
        console.error("category error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again."
        });
    }
}

// updateCategory
exports.updateCategory = async (req, res) => {
    try {
        const { categoryId, name, description } = req.body;
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ success: false, message: "Valid category ID is required" });
        }
        if (!name?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: "Name and description are required" });
        }

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { name, description },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            category
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};

// deleteCategory
exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!mongoose.isValidObjectId(categoryId)) {
            return res.status(400).json({ success: false, message: "Valid category ID is required" });
        }

        const categoryToDelete = await Category.findById(categoryId);
        if (!categoryToDelete) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        if (categoryToDelete.name === "Uncategorized") {
            return res.status(400).json({ success: false, message: "Cannot delete the default Uncategorized category" });
        }

        // Find or create "Uncategorized" category
        let defaultCategory = await Category.findOne({ name: "Uncategorized" });
        if (!defaultCategory) {
            defaultCategory = await Category.create({
                name: "Uncategorized",
                description: "Default category for courses whose original category was deleted"
            });
        }

        // Find courses that belong to the category being deleted
        const coursesToMove = await Course.find({ category: categoryId });
        const courseIds = coursesToMove.map(c => c._id);

        if (courseIds.length > 0) {
            // 1. Update the category reference in all those courses
            await Course.updateMany(
                { category: categoryId },
                { category: defaultCategory._id }
            );

            // 2. Add these courses to the default category's course array
            await Category.findByIdAndUpdate(defaultCategory._id, {
                $addToSet: { course: { $each: courseIds } }
            });
        }

        // Finally, delete the original category
        await Category.findByIdAndDelete(categoryId);

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully and courses were reassigned to 'Uncategorized'."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
    }
};