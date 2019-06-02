<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/tachyons@4.10.0/css/tachyons.min.css"
  />
</svelte:head>

<script>
  import meetups from "./features/meetups/meetupStore.js";
  import Form from "./features/meetups/createForm.svelte";
  import Header from "./features/header/header.svelte";
  import Meetup from "./features/meetups/meetup.svelte";

</script>

<style>
  main {
    display: grid;
  }
</style>

<main>
  <Header></Header>
  <section class="pa4">
    {#each $meetups as meet}
    <Meetup 
     imageURL={meet.imageURL}
     title={meet.title}
     isFavourite={meet.isFavourite}
     id={meet.id}
   />
    {/each}
  </section>
  <Form  />
</main>
