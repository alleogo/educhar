const Category = require("../models/Category");
const Course = require("../models/Course");

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
        console.log("Category Details: ", categoryDetails);

        //return response
        return res.status(200).json({
            success: true,
            message: "Category created successfully."
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
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
        return res.json({
            success: false,
            message: error.message
        });
    }
}


// categoryPageDetails
exports.categoryPageDetails = async (req, res) => {
    try {
        // get category ID
        const categoryId = req.body?.categoryId || req.query?.categoryId;

        // get courses for specified category ID
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "course",
                populate: {
                    path: "instructor"
                }
            }).exec();

        // validation
        if (!selectedCategory) {
            return res.status(404).json({
                success: false,
                message: "Data not found!"
            });
        }

        // return response
        return res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCatogories
            }
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// updateCategory
exports.updateCategory = async (req, res) => {
    try {
        const { categoryId, name, description } = req.body;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
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
        return res.status(500).json({ success: false, message: error.message });
    }
};

// deleteCategory
exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        if (!categoryId) {
            return res.status(400).json({ success: false, message: "Category ID is required" });
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
                $push: { course: { $each: courseIds } }
            });
        }

        // Finally, delete the original category
        await Category.findByIdAndDelete(categoryId);

        return res.status(200).json({
            success: true,
            message: "Category deleted successfully and courses were reassigned to 'Uncategorized'."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};