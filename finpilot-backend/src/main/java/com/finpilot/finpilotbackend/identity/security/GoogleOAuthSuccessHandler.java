package com.finpilot.finpilotbackend.identity.security;

import com.finpilot.finpilotbackend.identity.service.AccountActionService;
import com.finpilot.finpilotbackend.identity.service.GoogleOAuthService;
import jakarta.servlet.http.HttpServletRequest; import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value; import org.springframework.security.core.Authentication; import org.springframework.security.oauth2.core.user.OAuth2User; import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler; import org.springframework.stereotype.Component;
import java.io.IOException; import java.net.URLEncoder; import java.nio.charset.StandardCharsets;

@Component
public class GoogleOAuthSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final GoogleOAuthService google; private final AccountActionService actions; private final String frontendUrl;
    public GoogleOAuthSuccessHandler(GoogleOAuthService google, AccountActionService actions, @Value("${app.frontend.base-url}") String frontendUrl){this.google=google;this.actions=actions;this.frontendUrl=frontendUrl.replaceAll("/$","");}
    @Override public void onAuthenticationSuccess(HttpServletRequest request,HttpServletResponse response,Authentication authentication) throws IOException { try { OAuth2User principal=(OAuth2User)authentication.getPrincipal(); String code=actions.issueOauthExchange(google.resolve(principal)); getRedirectStrategy().sendRedirect(request,response,frontendUrl+"/oauth/callback?code="+URLEncoder.encode(code, StandardCharsets.UTF_8)); } catch (RuntimeException ex) { getRedirectStrategy().sendRedirect(request,response,frontendUrl+"/login?oauthError=1"); } }
}
