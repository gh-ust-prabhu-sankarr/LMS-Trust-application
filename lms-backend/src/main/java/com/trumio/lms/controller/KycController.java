package com.trumio.lms.controller;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.KycRequest;
import com.trumio.lms.dto.KycResponse;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.KycService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/kyc")
@RequiredArgsConstructor
public class KycController {

    private final KycService kycService;

    /**
     * Example request body:
     * {
     *   "fullName": "Rahul Sharma",
     *   "dob": "1998-05-12",
     *   "panNumber": "ABCDE1234F",
     *   "aadhaarNumber": "123412341234"
     * }
     */
    @PostMapping(value = "/submit", consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<KycResponse>> submitKyc(  //hhtreq-wrapper(suuces true--message--kycsrsp-actualdata
            @Valid @ModelAttribute KycRequest request, //valid-@noblank//read tetxt filed...name...  Read text fields from multipart request
            @RequestParam("panDocument") MultipartFile panDocument, //extract and  file size and file type conetnt //value from req
            @RequestParam("aadhaarDocument") MultipartFile aadhaarDocument) { //requestparam-to get data from url
        return ResponseEntity.ok(kycService.submitKyc(request, panDocument, aadhaarDocument));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<KycResponse> getMyKyc() {
        return ResponseEntity.ok(kycService.getMyKyc());
    }
}
