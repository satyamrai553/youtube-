import {Router} from "express";
import { registerUser } from "../controllers/user.controller.js";
import {uploads} from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
    uploads.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    );

router.route("/login").post(loginUser)    

//secured routes

router.route("/logout").post(verifyJWT, logoutUser)

export default router