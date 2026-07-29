package com.lifetrack.service;

import com.lifetrack.config.ReferenceProperties;
import com.lifetrack.dto.ExpenseDtos.ExpenseRequest;
import com.lifetrack.entity.Expense;
import com.lifetrack.exception.BadRequestException;
import com.lifetrack.exception.ResourceNotFoundException;
import com.lifetrack.repository.ExpenseRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ReferenceProperties referenceProperties;

    public ExpenseService(ExpenseRepository expenseRepository, ReferenceProperties referenceProperties) {
        this.expenseRepository = expenseRepository;
        this.referenceProperties = referenceProperties;
    }

    public List<Expense> findAll(Long userId) {
        return findAll(userId, null, null);
    }

    public List<Expense> findAll(Long userId, LocalDate from, LocalDate to) {
        if (from != null || to != null) {
            LocalDate end = (to != null) ? to : LocalDate.now();
            LocalDate start = (from != null) ? from : end.withDayOfMonth(1);
            if (start.isAfter(end)) {
                throw new BadRequestException("'from' date (" + start + ") cannot be after 'to' date (" + end + ")");
            }
            return expenseRepository.findByUserIdAndDateBetween(userId, start, end)
                    .stream()
                    .sorted((a, b) -> b.getDate().compareTo(a.getDate()))
                    .collect(java.util.stream.Collectors.toList());
        }
        return expenseRepository.findByUserIdOrderByDateDesc(userId);
    }

    public Expense findById(Long userId, Long id) {
        return expenseRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + id));
    }

    public Expense create(Long userId, ExpenseRequest request) {
        Expense expense = new Expense();
        expense.setUserId(userId);
        apply(expense, request);
        return expenseRepository.save(expense);
    }

    public Expense update(Long userId, Long id, ExpenseRequest request) {
        Expense expense = findById(userId, id);
        apply(expense, request);
        return expenseRepository.save(expense);
    }

    public void delete(Long userId, Long id) {
        Expense expense = findById(userId, id);
        expenseRepository.delete(expense);
    }

    private void apply(Expense expense, ExpenseRequest request) {
        if (!referenceProperties.isValidExpenseCategory(request.category())) {
            throw new BadRequestException(
                    "Unknown expense category: " + request.category()
                            + ". Valid categories: " + referenceProperties.getExpenseCategories());
        }
        expense.setDate(request.date() != null ? request.date() : LocalDate.now());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
    }
}
