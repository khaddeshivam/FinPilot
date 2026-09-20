package com.finpilot.finpilotbackend.finance.service;

import com.finpilot.finpilotbackend.finance.dto.AccountDtos.AccountResponse;
import com.finpilot.finpilotbackend.finance.dto.AccountDtos.CreateAccountRequest;
import com.finpilot.finpilotbackend.finance.entity.Account;
import com.finpilot.finpilotbackend.finance.exception.ResourceNotFoundException;
import com.finpilot.finpilotbackend.finance.repository.AccountRepository;
import com.finpilot.finpilotbackend.identity.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AccountService {

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public AccountResponse create(User user, CreateAccountRequest request) {
        Account account = new Account(
                user,
                request.getName(),
                request.getAccountType(),
                request.getOpeningBalance(),
                "INR"
        );
        return new AccountResponse(accountRepository.save(account));
    }

    public List<AccountResponse> listForUser(User user) {
        return accountRepository.findByUserId(user.getId()).stream()
                .map(AccountResponse::new)
                .collect(Collectors.toList());
    }

    public AccountResponse getOne(User user, Long accountId) {
        Account account = findOwnedOrThrow(user, accountId);
        return new AccountResponse(account);
    }

    // Package-private on purpose - TransactionService (same package tree) needs
    // the raw entity to update balance, not the DTO. Not exposed outside finance/.
    Account findOwnedOrThrow(User user, Long accountId) {
        return accountRepository.findByIdAndUserId(accountId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found: " + accountId));
    }
}
