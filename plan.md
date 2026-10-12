This will be a flashcard nextjs app that is for memorizing some terms, vocabulry or question-answer tuples. Features:
- for all auth, deploy, data storage etc, use supabase
- users can create their own flascards by email signin & log in 
- users can publish their flashcards as publicly
- Pages will be like a simple dashboard. 
- Even Unlooged in users can see all the public folders and public flascards
- creator of the flashcards can add, edit existing cards of that flash card
- List folders, and below files as paginated
- Show Play button on the file, and start showing the cards of that file.
- While playing a file, at the top, show icons for shuffle, go back etc,. Below screen will be split vertically to 2 half, upper side will show question, bottom side wil show answer, but at first, answers will be hidden. at the footer, show buttons for display answer, go to next & prev question. In this way, students will memorize answers for questions. If logged in user is the creator of the file, show edit button at the top row, so he can edit the question there in a modal
- Users should be able to create questions and answers as excel like table as batch. 
- Project should be implemented with the latest nextjs, shadcn, tailwind, typescript (if nextjs templates has a ready template for this, we can use it)



DB ps:
VdkSDKYkoNeegOyC

1. Install packages
Run this command to install the required dependencies.
Code:
File: Code
```
npm install @supabase/supabase-js @supabase/ssr
```

2. Add Supabase Library blocks
Install Supabase Library blocks via the shadcn registry.
Details:
Add UI components for auth, realtime, storage, and more at supabase.com/library.
Code:
File: Code
```
npx shadcn@latest add @supabase/supabase-client-nextjs
```

3. Set env variables
Add the following values to your env file.
Code:
File: .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://ilymccwhljdncehyawip.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_8HqiHFTTP8qi7r91t-D71g_IaSXxqYY
```

4. Install Agent Skills (optional)
Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
Code:
File: Code
```
npx skills add supabase/agent-skills
```