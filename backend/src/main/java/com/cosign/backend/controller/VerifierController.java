package com.cosign.backend.controller;

import com.cosign.backend.dto.VerifierRequest;
import com.cosign.backend.dto.VerifierResponse;
import com.cosign.backend.service.VerifierService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/verifiers")
public class VerifierController {

    private final VerifierService verifierService;

    public VerifierController(VerifierService verifierService) {
        this.verifierService = verifierService;
    }

    @GetMapping
    public ResponseEntity<List<VerifierResponse>> getMyVerifiers() {
        return ResponseEntity.ok(verifierService.getSavedVerifiers());
    }

    @PostMapping
    public ResponseEntity<VerifierResponse> addVerifier(@Valid @RequestBody VerifierRequest request) {
        return ResponseEntity.ok(verifierService.addVerifier(request.getEmail()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeVerifier(@PathVariable Long id) {
        verifierService.removeVerifier(id);
        return ResponseEntity.ok().build();
    }
}