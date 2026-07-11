package com.shrihari.etbackend.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {

        return new OpenAPI()

                .info(new Info()
                        .title("ET Hackathon Backend")
                        .description("AI Powered Urban Air Quality Intelligence Backend APIs")
                        .version("1.0")

                        .contact(new Contact()
                                .name("Team Domin8.exe")))

                .externalDocs(new ExternalDocumentation()
                        .description("Documentation"));
    }
}