import produce from "immer";
import { writable } from "svelte/store";

const meetups = writable([
  {
    id: "a",
    title: "Giant Whale Invests Huge Money to Build a ComputerOut of Plankton",
    subtitle: "c",
    description: "d",
    imageURL: "http://mrmrs.github.io/photos/whale.jpg",
    address: "e",
    contact: "f",
    isFavourite: true
  },
  {
    id: "a22",
    title: "b2s",
    subtitle: "c",
    description: "d",
    imageURL: "d",
    address: "e",
    contact: "f",
    isFavourite: false
  }
]);

const addMeetup = () => {
  // https://github.com/immerjs/immer

  newMeetups = produce(meetups, draft => {
    draft.push({
      id: Math.random().toString(),
      isFavourite: false,
      ...newMeetup
    });
  });

  meetups.update(newMeetups);
};

const toggleFavourite = id =>
  meetups.update(items =>
    produce(items, draft => {
      const index = draft.findIndex(meet => meet.id === id);
      draft[index].isFavourite = !draft[index].isFavourite;
    })
  );

const customMeetupsStore = {
  subscribe: meetups.subscribe,
  addMeetup,
  toggleFavourite
};

export default customMeetupsStore;
