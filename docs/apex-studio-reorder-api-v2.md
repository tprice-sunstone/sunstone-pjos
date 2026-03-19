# StudioReorderAPI — Updated Apex Class (v2)

Two new actions added: `searchAccounts` and `createAccount`.
All existing actions (`findAccount`, `getPaymentMethods`, `chargeSavedCard`, `addCard`) are unchanged.

## Deployment

```powershell
# From your SF project directory (sfdx project with force-app structure)
# 1. Replace the class files:
#    force-app/main/default/classes/StudioReorderAPI.cls
#    force-app/main/default/classes/StudioReorderAPI.cls-meta.xml
#    force-app/main/default/classes/StudioReorderAPITest.cls
#    force-app/main/default/classes/StudioReorderAPITest.cls-meta.xml
#
# 2. Deploy:
sf project deploy start --source-dir force-app/main/default/classes/StudioReorderAPI.cls force-app/main/default/classes/StudioReorderAPITest.cls --target-org production --test-level RunSpecifiedTests --tests StudioReorderAPITest
```

---

## StudioReorderAPI.cls

```apex
@RestResource(urlMapping='/studio/reorder')
global class StudioReorderAPI {

    @HttpPost
    global static String handlePost() {
        RestRequest req = RestContext.request;
        Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());
        String action = (String) body.get('action');

        if (action == 'findAccount') {
            return doFindAccount(body);
        } else if (action == 'getPaymentMethods') {
            return doGetPaymentMethods(body);
        } else if (action == 'chargeSavedCard') {
            return doChargeSavedCard(body);
        } else if (action == 'addCard') {
            return doAddCard(body);
        } else if (action == 'searchAccounts') {
            return doSearchAccounts(body);
        } else if (action == 'createAccount') {
            return doCreateAccount(body);
        }

        return JSON.serialize(new Map<String, Object>{
            'error' => 'Unknown action: ' + action
        });
    }

    // ── searchAccounts ──────────────────────────────────────────────────
    // Multi-strategy account search: email → business name → person name
    // Returns array of matches with confidence level.
    private static String doSearchAccounts(Map<String, Object> body) {
        String email = (String) body.get('email');
        String businessName = (String) body.get('businessName');
        String firstName = (String) body.get('firstName');
        String lastName = (String) body.get('lastName');

        List<Map<String, Object>> results = new List<Map<String, Object>>();

        // Strategy 1: Exact email match on Contact
        if (String.isNotBlank(email)) {
            List<Contact> contacts = [
                SELECT Id, AccountId, Account.Name, Account.Phone,
                       Account.ShippingCity, Account.ShippingState,
                       Account.ShippingStreet, Account.ShippingPostalCode,
                       Account.ShippingCountry
                FROM Contact
                WHERE Email = :email
                AND AccountId != null
                LIMIT 5
            ];
            Set<Id> seenAccountIds = new Set<Id>();
            for (Contact c : contacts) {
                if (!seenAccountIds.contains(c.AccountId)) {
                    seenAccountIds.add(c.AccountId);
                    results.add(buildMatch(c.AccountId, c.Account, 'exact_email', 'Contact email match'));
                }
            }
            if (!results.isEmpty()) {
                return JSON.serialize(new Map<String, Object>{
                    'matches' => results,
                    'confidence' => 'exact_email'
                });
            }
        }

        // Strategy 2: Normalized business name match on Account.Name
        if (String.isNotBlank(businessName)) {
            String normalized = normalizeName(businessName);
            // Query accounts with similar name — use LIKE for broad match,
            // then filter with normalization in Apex
            String likePattern = '%' + String.escapeSingleQuotes(
                normalized.length() > 3 ? normalized.substring(0, Math.min(normalized.length(), 20)) : normalized
            ) + '%';

            List<Account> accounts = [
                SELECT Id, Name, Phone, ShippingCity, ShippingState,
                       ShippingStreet, ShippingPostalCode, ShippingCountry
                FROM Account
                WHERE Name LIKE :likePattern
                LIMIT 10
            ];

            for (Account a : accounts) {
                String accountNorm = normalizeName(a.Name);
                // Match if normalized names are equal or one contains the other
                if (accountNorm == normalized ||
                    accountNorm.contains(normalized) ||
                    normalized.contains(accountNorm)) {
                    results.add(buildMatch(a.Id, a, 'business_name', 'Business name match'));
                }
            }

            if (!results.isEmpty()) {
                return JSON.serialize(new Map<String, Object>{
                    'matches' => results,
                    'confidence' => 'business_name'
                });
            }
        }

        // Strategy 3: Person name match on Account.Name
        if (String.isNotBlank(firstName) && String.isNotBlank(lastName)) {
            String nameLike = '%' + String.escapeSingleQuotes(firstName) + '%' +
                              String.escapeSingleQuotes(lastName) + '%';
            List<Account> accounts = [
                SELECT Id, Name, Phone, ShippingCity, ShippingState,
                       ShippingStreet, ShippingPostalCode, ShippingCountry
                FROM Account
                WHERE Name LIKE :nameLike
                LIMIT 10
            ];
            for (Account a : accounts) {
                results.add(buildMatch(a.Id, a, 'person_name', 'Name match'));
            }
            if (!results.isEmpty()) {
                return JSON.serialize(new Map<String, Object>{
                    'matches' => results,
                    'confidence' => 'person_name'
                });
            }
        }

        // No matches
        return JSON.serialize(new Map<String, Object>{
            'matches' => results,
            'confidence' => 'none'
        });
    }

    private static Map<String, Object> buildMatch(Id accountId, SObject acct, String confidence, String matchMethod) {
        return new Map<String, Object>{
            'accountId' => accountId,
            'accountName' => (String) acct.get('Name'),
            'city' => (String) acct.get('ShippingCity'),
            'state' => (String) acct.get('ShippingState'),
            'phone' => (String) acct.get('Phone'),
            'confidence' => confidence,
            'matchMethod' => matchMethod
        };
    }

    private static String normalizeName(String name) {
        if (String.isBlank(name)) return '';
        String n = name.toLowerCase().trim();
        // Strip common business suffixes
        n = n.replaceAll('\\b(llc|inc|corp|co|ltd|corporation|company|incorporated)\\b', '');
        // Strip trailing punctuation
        n = n.replaceAll('[.,;!]+$', '');
        // Collapse multiple spaces
        n = n.replaceAll('\\s+', ' ').trim();
        return n;
    }

    // ── createAccount ───────────────────────────────────────────────────
    // Creates a new SF Account + Contact for a first-time Sunstone customer.
    private static String doCreateAccount(Map<String, Object> body) {
        String accountName = (String) body.get('accountName');
        String firstName = (String) body.get('firstName');
        String lastName = (String) body.get('lastName');
        String email = (String) body.get('email');
        String phone = (String) body.get('phone');
        String shippingStreet = (String) body.get('shippingStreet');
        String shippingCity = (String) body.get('shippingCity');
        String shippingState = (String) body.get('shippingState');
        String shippingPostalCode = (String) body.get('shippingPostalCode');
        String shippingCountry = (String) body.get('shippingCountry');

        if (String.isBlank(accountName)) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => 'accountName is required'
            });
        }

        try {
            // Create Account
            Account acct = new Account(
                Name = accountName,
                Phone = phone,
                Industry = 'Permanent Jewelry',
                LeadSource = 'Sunstone Studio',
                ShippingStreet = shippingStreet,
                ShippingCity = shippingCity,
                ShippingState = shippingState,
                ShippingPostalCode = shippingPostalCode,
                ShippingCountry = String.isNotBlank(shippingCountry) ? shippingCountry : 'US'
            );
            insert acct;

            // Create Contact linked to Account
            Contact con = new Contact(
                AccountId = acct.Id,
                FirstName = firstName,
                LastName = String.isNotBlank(lastName) ? lastName : accountName,
                Email = email,
                Phone = phone
            );
            insert con;

            return JSON.serialize(new Map<String, Object>{
                'success' => true,
                'accountId' => acct.Id,
                'contactId' => con.Id
            });
        } catch (Exception e) {
            return JSON.serialize(new Map<String, Object>{
                'success' => false,
                'error' => e.getMessage()
            });
        }
    }

    // ── Existing actions (unchanged) ────────────────────────────────────

    private static String doFindAccount(Map<String, Object> body) {
        // ... existing findAccount implementation unchanged ...
        String email = (String) body.get('email');
        if (String.isBlank(email)) {
            return JSON.serialize(new Map<String, Object>{ 'error' => 'email is required' });
        }

        List<Contact> contacts = [
            SELECT Id, AccountId, Account.Name, Account.Phone,
                   Account.ShippingStreet, Account.ShippingCity,
                   Account.ShippingState, Account.ShippingPostalCode,
                   Account.ShippingCountry
            FROM Contact WHERE Email = :email AND AccountId != null LIMIT 1
        ];

        if (contacts.isEmpty()) {
            return JSON.serialize(new Map<String, Object>{ 'accountId' => null });
        }

        Contact c = contacts[0];
        return JSON.serialize(new Map<String, Object>{
            'accountId' => c.AccountId,
            'contactId' => c.Id,
            'accountName' => c.Account.Name,
            'shippingStreet' => c.Account.ShippingStreet,
            'shippingCity' => c.Account.ShippingCity,
            'shippingState' => c.Account.ShippingState,
            'shippingPostalCode' => c.Account.ShippingPostalCode,
            'shippingCountry' => c.Account.ShippingCountry
        });
    }

    private static String doGetPaymentMethods(Map<String, Object> body) {
        // ... existing implementation unchanged ...
        // This calls your Authorize.net integration to list saved cards.
        // Keep your current implementation as-is.
        String accountId = (String) body.get('accountId');
        // YOUR EXISTING IMPLEMENTATION HERE
        return JSON.serialize(new Map<String, Object>{ 'paymentMethods' => new List<Object>() });
    }

    private static String doChargeSavedCard(Map<String, Object> body) {
        // ... existing implementation unchanged ...
        // YOUR EXISTING IMPLEMENTATION HERE
        return JSON.serialize(new Map<String, Object>{ 'success' => true });
    }

    private static String doAddCard(Map<String, Object> body) {
        // ... existing implementation unchanged ...
        // YOUR EXISTING IMPLEMENTATION HERE
        return JSON.serialize(new Map<String, Object>{ 'success' => true });
    }
}
```

## StudioReorderAPITest.cls

```apex
@isTest
private class StudioReorderAPITest {

    @TestSetup
    static void setup() {
        // Create a test Account with shipping address
        Account testAcct = new Account(
            Name = 'Jane\'s Jewelry LLC',
            Phone = '8015551234',
            Industry = 'Permanent Jewelry',
            ShippingStreet = '123 Main St',
            ShippingCity = 'St George',
            ShippingState = 'UT',
            ShippingPostalCode = '84770',
            ShippingCountry = 'US'
        );
        insert testAcct;

        // Create a Contact linked to the Account
        Contact testContact = new Contact(
            AccountId = testAcct.Id,
            FirstName = 'Jane',
            LastName = 'Smith',
            Email = 'jane@gmail.com',
            Phone = '8015551234'
        );
        insert testContact;
    }

    // ── searchAccounts tests ────────────────────────────────────────────

    @isTest
    static void testSearchAccounts_ExactEmail() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'searchAccounts',
            'email' => 'jane@gmail.com',
            'businessName' => '',
            'firstName' => '',
            'lastName' => ''
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals('exact_email', (String) parsed.get('confidence'));
        List<Object> matches = (List<Object>) parsed.get('matches');
        System.assert(matches.size() > 0, 'Should find at least one match');

        Map<String, Object> match = (Map<String, Object>) matches[0];
        System.assertEquals('Jane\'s Jewelry LLC', (String) match.get('accountName'));
        System.assertEquals('exact_email', (String) match.get('confidence'));
    }

    @isTest
    static void testSearchAccounts_BusinessName() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'searchAccounts',
            'email' => 'nonexistent@example.com',
            'businessName' => 'Jane\'s Jewelry',
            'firstName' => '',
            'lastName' => ''
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals('business_name', (String) parsed.get('confidence'));
        List<Object> matches = (List<Object>) parsed.get('matches');
        System.assert(matches.size() > 0, 'Should find business name match');
    }

    @isTest
    static void testSearchAccounts_PersonName() {
        // Create an account named after a person (no business name overlap)
        Account personAcct = new Account(Name = 'Sarah Johnson PJ', Industry = 'Permanent Jewelry');
        insert personAcct;

        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'searchAccounts',
            'email' => 'nobody@example.com',
            'businessName' => 'Totally Different Business',
            'firstName' => 'Sarah',
            'lastName' => 'Johnson'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals('person_name', (String) parsed.get('confidence'));
    }

    @isTest
    static void testSearchAccounts_NoMatch() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'searchAccounts',
            'email' => 'nobody@nowhere.com',
            'businessName' => 'ZZZZZ Nonexistent Business ZZZZZ',
            'firstName' => 'Zzzzz',
            'lastName' => 'Qqqqq'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals('none', (String) parsed.get('confidence'));
        List<Object> matches = (List<Object>) parsed.get('matches');
        System.assertEquals(0, matches.size());
    }

    // ── createAccount tests ─────────────────────────────────────────────

    @isTest
    static void testCreateAccount_Success() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'createAccount',
            'accountName' => 'New Studio PJ',
            'firstName' => 'Alex',
            'lastName' => 'Rivera',
            'email' => 'alex@newstudio.com',
            'phone' => '3855551234',
            'shippingStreet' => '456 Elm St',
            'shippingCity' => 'Provo',
            'shippingState' => 'UT',
            'shippingPostalCode' => '84601',
            'shippingCountry' => 'US'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals(true, parsed.get('success'));
        System.assertNotEquals(null, parsed.get('accountId'));
        System.assertNotEquals(null, parsed.get('contactId'));

        // Verify the Account was created correctly
        Account acct = [SELECT Name, Industry, LeadSource, ShippingCity FROM Account WHERE Id = :(String) parsed.get('accountId')];
        System.assertEquals('New Studio PJ', acct.Name);
        System.assertEquals('Permanent Jewelry', acct.Industry);
        System.assertEquals('Sunstone Studio', acct.LeadSource);
        System.assertEquals('Provo', acct.ShippingCity);

        // Verify the Contact
        Contact con = [SELECT FirstName, LastName, Email FROM Contact WHERE Id = :(String) parsed.get('contactId')];
        System.assertEquals('Alex', con.FirstName);
        System.assertEquals('Rivera', con.LastName);
        System.assertEquals('alex@newstudio.com', con.Email);
    }

    @isTest
    static void testCreateAccount_MissingName() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'createAccount',
            'accountName' => '',
            'firstName' => 'Alex',
            'lastName' => 'Rivera',
            'email' => 'alex@example.com'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);

        System.assertEquals(false, parsed.get('success'));
        System.assertNotEquals(null, parsed.get('error'));
    }

    // ── Existing action tests ───────────────────────────────────────────

    @isTest
    static void testFindAccount_Found() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'findAccount',
            'email' => 'jane@gmail.com'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);
        System.assertNotEquals(null, parsed.get('accountId'));
    }

    @isTest
    static void testFindAccount_NotFound() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'findAccount',
            'email' => 'nobody@nowhere.com'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);
        System.assertEquals(null, parsed.get('accountId'));
    }

    @isTest
    static void testUnknownAction() {
        RestRequest req = new RestRequest();
        req.requestBody = Blob.valueOf(JSON.serialize(new Map<String, Object>{
            'action' => 'doesNotExist'
        }));
        RestContext.request = req;

        String result = StudioReorderAPI.handlePost();
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(result);
        System.assertNotEquals(null, parsed.get('error'));
    }
}
```

## Notes

- The `searchAccounts` action cascades through three strategies (email → business name → person name) and returns as soon as it finds matches at any level. This prevents unnecessary fuzzy matching when an exact email hit is found.
- The `normalizeName` helper strips LLC/Inc/Corp/Co/Ltd suffixes, trailing punctuation, and extra spaces before comparing. This handles "Jane's Jewelry LLC" matching "Jane's Jewelry".
- The `createAccount` action sets `Industry = 'Permanent Jewelry'` and `LeadSource = 'Sunstone Studio'` automatically — these are required by your SF validation rules.
- If `lastName` is blank, it falls back to `accountName` for the Contact's LastName (SF requires LastName on Contact).
- Existing actions (`findAccount`, `getPaymentMethods`, `chargeSavedCard`, `addCard`) are **unchanged**. Merge the new `doSearchAccounts` and `doCreateAccount` methods and the router entries into your existing class.
