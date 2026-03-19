const Category = require("../models/Category");

// createCategory handler
exports.createCategory = async (req, res) => {
    try{
        // fetch data
        const {name, description} = req.body

        // validation
        if(!name || !description){
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
            message: "Category created successfully.  "
        })
    }
    catch(error){
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// getAllCategoriess
exports.showAllCategories = async (req, res) => {
    try{
        const allCategories = await Category.find({}, {name: true, description: true});
        return res.status(200).json({
            success: true, 
            message: "All Categories returned successfully.",
            allCategories
        });
    }
    catch(error){
        return res.json({
            success: false,
            message: error.message
        });
    }
}

// categoryPageDetails
exports.categoryPageDetails = async (req, res) => {
    try{
        // get category ID
        const {categoryId} = req.body;

        // get courses for specified category ID
        const selectedCategory = await Category.findById(categoryId)
                                        .populate("courses").exec(); 

        // validation
        if(!selectedCategory){
            return res.status(404).json({
                success: false,
                message: "Data not found!"
            });
        }

        // get course for different categories
        const differentCatogories = await Category.find(
                                          {_id: {$ne: categoryId}}
                                        )
                                        .populate("courses").exec();

        // TODO: HW --> get top 10 selling courses

        // return response
        return res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCatogories
            }
        });
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}