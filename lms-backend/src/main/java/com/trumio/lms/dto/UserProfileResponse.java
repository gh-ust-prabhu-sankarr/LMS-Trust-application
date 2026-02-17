package com.trumio.lms.dto;

import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {
    private String id;
    private String username;
    private String email;
    private String phone;
    private Role role;
    private KYCStatus kycStatus;
    private Boolean active;
}

