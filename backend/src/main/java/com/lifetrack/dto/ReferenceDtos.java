package com.lifetrack.dto;

import com.lifetrack.config.ReferenceProperties;

import java.util.List;

/** Read-only server-owned vocabulary exposed to frontend controls. */
public class ReferenceDtos {

    /**
     * Domain vocabulary the frontend used to hardcode. Fetch once at app load
     * instead of shipping these lists in the bundle, and use them to populate
     * dropdowns/checklists so the UI can never submit a value the server will
     * reject.
     */
    public record ReferenceResponse(
            List<String> expenseCategories,
            List<String> transactionalHabits,
            List<String> embeddedHabits,
            List<String> journalMoods,
            List<String> dailyMoods
    ) {
        public static ReferenceResponse from(ReferenceProperties props) {
            return new ReferenceResponse(
                    props.getExpenseCategories(),
                    props.getTransactionalHabits(),
                    props.getEmbeddedHabits(),
                    props.getJournalMoods(),
                    props.getDailyMoods()
            );
        }
    }
}
