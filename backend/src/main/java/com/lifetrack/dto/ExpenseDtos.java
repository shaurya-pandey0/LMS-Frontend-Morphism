package com.lifetrack.dto;

import com.lifetrack.entity.Expense;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

/** Request and response contracts for user-owned expense records. */
public class ExpenseDtos {

    /** Fields clients may supply when creating or replacing an expense. */
    public record ExpenseRequest(
            LocalDate date,
            @NotBlank String category,
            @Positive double amount
    ) {}

    /** Persisted expense representation returned to authenticated clients. */
    public record ExpenseResponse(
            Long id,
            LocalDate date,
            String category,
            double amount
    ) {
        public static ExpenseResponse from(Expense expense) {
            return new ExpenseResponse(
                    expense.getId(),
                    expense.getDate(),
                    expense.getCategory(),
                    expense.getAmount()
            );
        }
    }
}
