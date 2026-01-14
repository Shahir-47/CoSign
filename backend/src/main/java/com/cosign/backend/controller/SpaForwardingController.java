package com.cosign.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaForwardingController {

    @SuppressWarnings("MVCPathVariableInspection")
    @RequestMapping(value = {"/", "/**/{path:[^.]*}"})
    public String forward(HttpServletRequest request) {

        if (request.getRequestURI().startsWith("/api")) {
            return "forward:/error";
        }

        return "forward:/index.html";
    }
}