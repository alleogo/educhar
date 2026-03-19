const Section = require("../models/Section");
const Course = require("../models/Course");

// createSection handler
exports.createSection = async (req, res) => {
    try{
        // fetch data
        const {sectionName, courseId} = req.body;
        // validation
        if(!sectionName || !courseId){
            return res.status(400).json({
                success: false, 
                message: "Missing Properties"
            });
        }

        // create Section
        const newSection = await Section.create({sectionName});

        // update Course with sectionId ObjectID
        const updatedCourseDetails = Course.findOneAndUpdate(courseId, 
                                                        {
                                                        $push:{
                                                            courseContent: newSection._id
                                                        }  
                                                        },
                                                        {new:true}
                                                    );
        // TODO: use populate to replace sections/sub-sections both in updatedCourseDetails

        // return response
        return res.staus(200).json({
            success: true,
            message: "Section created succerssfully.",
            updatedCourseDetails
        });
    }
    catch(error){
        return res.status(500).json({
            success: false, 
            message: "Unabele to create section",
            error: error.message
        });
    }
}

// updateSection
exports.updateSection = async (req, res) => {
    try{
        // fetch data
        const {sectionName, sectionId} = req.body;

        // validation
        if(!sectionName || !sectionId){
            return res.status(400).json({
                success: false, 
                message: "Missing Properties"
            });
        }

        // update section
        const section = await Section.findByIdAndUpdate(sectionId, {sectionName}, {new:true});

        // return response
        return res.status(200).json({
            success: true,
            message: "Section details updated successfully."
        })
    }
    catch(error){
        return res.status(500).json({
            success: false, 
            message: "Failed to update section",
            error: error.message
        });
    }
}

// deletesection
exports.deleteSection = async (req, res) => {
    try{
        // get ID - assuming that we're sending ID in parameter
        const {sectionId} = req.params;

        // validation
        if(!sectionId){
            return res.status(400).json({
                success: false,
                message: "Missing Properties."
            });
        }

        // delete section
        const deletedSection = await Section.findByIdAndDelete(sectionId);
        // TODO: Do we need to delete the entry from course schema ?? 
        
        // return response
        return res.status(200).json({
            success: true,
            message: "Section deleted successfully."
        }); 
    }
    catch(error){
        return res.status(500).json({
            success: false, 
            message: "Failed to delete section",
            error: error.message
        });
    }
}