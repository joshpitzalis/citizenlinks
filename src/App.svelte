<svelte:head>
  <link
    rel="stylesheet"
    href="https://unpkg.com/tachyons@4.10.0/css/tachyons.min.css"
  />
</svelte:head>

<script>
  import produce from "immer";
  import Form from "./features/meetups/createForm.svelte";
  import Header from "./features/header/header.svelte";
  import Meetup from "./features/meetups/meetup.svelte";

  let meetups = [
    {
      id: "a",
      title:
        "Giant Whale Invests Huge Money to Build a ComputerOut of Plankton",
      subtitle: "c",
      description: "d",
      imageURL: "http://mrmrs.github.io/photos/whale.jpg",
      address: "e",
      contact: "f"
    },
    {
      id: "a",
      title: "b2",
      subtitle: "c",
      description: "d",
      imageURL: "d",
      address: "e",
      contact: "f"
    }
  ];

  let id = "";
  let title = "";
  let subtitle = "";
  let description = "";
  let imageURL = "";
  let address = "";
  let contact = "";


  const addMeetup = () => {
    const newMeetup = {
      id: Math.random().toString(),
      title,
      subtitle,
      description,
      imageURL,
      address,
      contact
    };

    // https://github.com/immerjs/immer
    meetups = produce(meetups, draft => {
      draft.push(newMeetup);
    });

    // reset inputs
    title = "";
    subtitle = "";
    description = "";
    imageURL = "";
    address = "";
    contact = "";
  };
</script>

<style>
  main {
    display: grid;
  }
</style>

<main>
  <Header></Header>
  <section class="pa4">
    {#each meetups as meetup}
    <Meetup title="{meetup.title}" imageURL="{meetup.imageURL}"></Meetup>
    {/each}
  </section>
  <Form on:handleSubmit="{addMeetup}" bind:title bind:subtitle bind:description
  bind:imageURL bind:address bind:contact />
</main>
